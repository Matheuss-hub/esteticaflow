import { PackageDetailPage } from "@/components/package-pages";

export default function PackagePage({ params }: { params: { id: string } }) {
  return <PackageDetailPage packageId={params.id} />;
}