import InternshipDetailClient from "./InternshipDetailClient";

export default async function InternshipDetailPage({ params }) {
  const resolvedParams = params && typeof params.then === "function" ? await params : params;
  return <InternshipDetailClient id={resolvedParams?.id} />;
}
