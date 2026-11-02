import InternshipDetailClient from "@/app/internships/[id]/InternshipDetailClient";

export default async function StudentInternshipDetailRoute({ params }) {
  const resolvedParams = params && typeof params.then === "function" ? await params : params;
  return <InternshipDetailClient id={resolvedParams?.id} />;
}
