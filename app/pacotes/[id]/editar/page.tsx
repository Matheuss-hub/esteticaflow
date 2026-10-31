import { PackageForm } from "@/components/package-pages";

export default function EditPackagePage({ params }: { params: { id: string } }) {
  return <PackageForm packageId={params.id} />;
}