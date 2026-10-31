import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

export const authMiddleware = async (request, reply) => {
  const token = request.cookies.linguacoach_session;

  if (!token) {
    return reply.code(401).send({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] },
    );

    if (
      !decoded.sub ||
      !mongoose.isValidObjectId(decoded.sub)
    ) {
      throw new Error("Invalid session");
    }

    const user = await User.findById(decoded.sub);

    if (!user) {
      return reply.code(401).send({
        success: false,
        message: "User not found",
      });
    }

    request.user = user;
  } catch {
    return reply.code(401).send({
      success: false,
      message: "Invalid or expired session",
    });
  }
};