import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const SKILL = z.enum([
  "Speaking",
  "Listening",
  "Reading",
  "Writing",
  "Grammar",
  "Vocabulary",
  "Pronunciation",
]);

const updateMeSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    preferredExplanationLanguage: z
      .enum(["uz", "en", "ru"])
      .optional(),
    dailyTargetMinutes: z.number().int().min(15).max(600).optional(),
    minimumTargetMinutes: z.number().int().min(15).max(600).optional(),
    extendedTargetMinutes: z.number().int().min(15).max(600).optional(),
    dailyPackSize: z.number().int().min(10).max(300).optional(),
    englishLevelEstimate: z
      .string()
      .trim()
      .min(1)
      .max(16)
      .optional(),
    germanLevelEstimate: z
      .string()
      .trim()
      .min(1)
      .max(16)
      .optional(),
    learningGoals: z
      .object({
        english: z.array(SKILL).max(10).optional(),
        german: z.array(SKILL).max(10).optional(),
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

const COOKIE_NAME = "linguacoach_session";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

const publicUser = (user) => ({
  id: user._id.toString(),
  displayName: user.displayName,
  email: user.email,
  role: user.role,
  timezone: user.timezone,
  preferredExplanationLanguage: user.preferredExplanationLanguage,
  dailyTargetMinutes: user.dailyTargetMinutes,
  minimumTargetMinutes: user.minimumTargetMinutes,
  extendedTargetMinutes: user.extendedTargetMinutes,
  dailyPackSize: user.dailyPackSize,
  englishLevelEstimate: user.englishLevelEstimate,
  germanLevelEstimate: user.germanLevelEstimate,
  learningGoals: user.learningGoals,
});

export const register = async (request, reply) => {
  const parsed = registerSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid registration data",
      errors: z.flattenError(parsed.error),
    });
  }

  const { displayName, password } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return reply.code(409).send({
      success: false,
      message: "Email already registered",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await User.create({
      displayName,
      email,
      passwordHash,
    });

    return reply.code(201).send({
      success: true,
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return reply.code(409).send({
        success: false,
        message: "Email already registered",
      });
    }

    throw error;
  }
};

export const login = async (request, reply) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid login data",
    });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    return reply.code(401).send({
      success: false,
      message: "Invalid email or password",
    });
  }

  const validPassword = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash,
  );

  if (!validPassword) {
    return reply.code(401).send({
      success: false,
      message: "Invalid email or password",
    });
  }

  const token = jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d", algorithm: "HS256" },
  );

  reply.setCookie(COOKIE_NAME, token, cookieOptions);

  return reply.send({
    success: true,
    user: publicUser(user),
  });
};

export const getMe = async (request, reply) => {
  return reply.send({
    success: true,
    user: publicUser(request.user),
  });
};

export const updateMe = async (request, reply) => {
  const parsed = updateMeSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.code(400).send({
      success: false,
      message: "Invalid profile data",
      errors: z.flattenError(parsed.error),
    });
  }

  const update = { ...parsed.data };

  // Daily / minimum / extended consistency: minimum <= daily <= extended
  const current = request.user;

  const daily =
    update.dailyTargetMinutes ?? current.dailyTargetMinutes;
  const minimum =
    update.minimumTargetMinutes ?? current.minimumTargetMinutes;
  const extended =
    update.extendedTargetMinutes ?? current.extendedTargetMinutes;

  if (minimum > daily || daily > extended) {
    return reply.code(400).send({
      success: false,
      message:
        "Target minutes must satisfy minimum ≤ daily ≤ extended",
    });
  }

  const user = await User.findByIdAndUpdate(
    current._id,
    { $set: update },
    { new: true, runValidators: true },
  );

  if (!user) {
    return reply.code(404).send({
      success: false,
      message: "User not found",
    });
  }

  return reply.send({
    success: true,
    user: publicUser(user),
  });
};

export const logout = async (request, reply) => {
  reply.clearCookie(COOKIE_NAME, {
    path: "/",
  });

  return reply.send({
    success: true,
    message: "Logged out successfully",
  });
};
