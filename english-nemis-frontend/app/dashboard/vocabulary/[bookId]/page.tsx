import VocabularyUnits from "../../../../components/vocabulary/vocabulary-units";

export const instant = false;

type Props = {

  params: Promise<{ bookId: string }>;

};

export default async function VocabularyBookPage({

  params,

}: Props) {

  const { bookId } = await params;

  return <VocabularyUnits bookId={bookId} />;

}