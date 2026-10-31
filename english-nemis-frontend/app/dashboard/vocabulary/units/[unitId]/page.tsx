import VocabularyUnitDetail from "../../../../../components/vocabulary/vocabulary-unit-detail";
export const instant = false;


type Props = {

  params: Promise<{ unitId: string }>;

};

export default async function VocabularyUnitPage({

  params,

}: Props) {

  const { unitId } = await params;

  return <VocabularyUnitDetail unitId={unitId} />;

}