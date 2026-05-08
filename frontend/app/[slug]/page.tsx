import { PadEditor } from "./PadEditor";

export default async function PadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PadEditor slug={slug} />;
}
