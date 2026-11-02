"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  Building2,
  GraduationCap,
  UserCheck,
  XCircle,
  FileText,
  Mail,
  Phone,
  Eye,
  SlidersHorizontal,
  PlusCircle,
  Briefcase,
  MapPin,
  Banknote,
  Calendar,
  X,
  Layers,
  Check,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { apiRequest, applicationService, internshipService, authService } from "@/services/apiClient";

const statusTabs = ["All", "Applied", "Reviewing", "Shortlisted", "Interviewing", "Hired", "Rejected"];

const PREDEFINED_DEPARTMENTS = [
  "Engineering",
  "Design",
  "AI & Data",
  "Product",
  "Marketing",
];

const PREDEFINED_TRACKS = [
  "Development",
  "UI/UX & Product Design",
  "AI, Machine Learning & Data",
  "Product Management",
  "Growth & Technical Marketing",
];

const DEPARTMENT_TRACK_MAP = {
  Engineering: "Development",
  Design: "UI/UX & Product Design",
  "AI & Data": "AI, Machine Learning & Data",
  Product: "Product Management",
  Marketing: "Growth & Technical Marketing",
};

function CompanyApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [companyInternships, setCompanyInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInternshipId, setSelectedInternshipId] = useState("all");
  const [selectedTab, setSelectedTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  // Post Internship Form State
  const [postForm, setPostForm] = useState({
    role: "",
    department: "Engineering",
    track: "Development",
    mode: "remote",
    location: "Remote",
    stipend: "₹25,000 / month",
    duration: "3 Months",
    skills: "React, Node.js, TypeScript",
    description: "",
  });
  const [customDepartment, setCustomDepartment] = useState("");
  const [customTrack, setCustomTrack] = useState("");
  const [isCustomDepartment, setIsCustomDepartment] = useState(false);
  const [isCustomTrack, setIsCustomTrack] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [postingLoading, setPostingLoading] = useState(false);

  const handleDepartmentChange = (e) => {
    const val = e.target.value;
    if (val === "custom") {
      setIsCustomDepartment(true);
      setPostForm((prev) => ({ ...prev, department: "custom" }));
    } else {
      setIsCustomDepartment(false);
      setCustomDepartment("");
      setFormErrors((prev) => ({ ...prev, department: "" }));
      setPostForm((prev) => {
        const updated = { ...prev, department: val };
        if (!isCustomTrack && DEPARTMENT_TRACK_MAP[val]) {
          updated.track = DEPARTMENT_TRACK_MAP[val];
        }
        return updated;
      });
    }
  };

  const handleTrackChange = (e) => {
    const val = e.target.value;
    if (val === "custom") {
      setIsCustomTrack(true);
      setPostForm((prev) => ({ ...prev, track: "custom" }));
    } else {
      setIsCustomTrack(false);
      setCustomTrack("");
      setFormErrors((prev) => ({ ...prev, track: "" }));
      setPostForm((prev) => ({ ...prev, track: val }));
    }
  };

  // Fetch applications and posted internships directly from API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    authService.getCurrentUser().then((user) => {
      if (isMounted && user) {
        setCurrentUser(user);
      }
    }).catch(() => {});

    applicationService.getCompanyApplications({}).then((res) => {
      if (isMounted && res && Array.isArray(res)) {
        setApplications(res);
      }
    }).catch(() => {});

    internshipService.list({}).then((res) => {
      if (isMounted && res && Array.isArray(res)) {
        setCompanyInternships(res);
      }
      if (isMounted) setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Automatically open Post Internship modal if ?new=true is in the query params
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setShowPostModal(true);
    }
  }, [searchParams]);

  // Handle closing modal and removing ?new=true from URL
  const handleClosePostModal = () => {
    setShowPostModal(false);
    setFormErrors({});
    if (searchParams.get("new") === "true") {
      router.replace("/company/applications");
    }
  };

  // Filter applications by selected internship, status tab, and search query
  const filteredApplications = applications.filter((app) => {
    const matchesInternship =
      selectedInternshipId === "all" || app.internshipId === selectedInternshipId;
    const matchesTab =
      selectedTab === "All" || app.status.toLowerCase() === selectedTab.toLowerCase();
    const matchesSearch =
      app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.college?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesInternship && matchesTab && matchesSearch;
  });

  // Calculate applicant counts per internship
  const getInternshipApplicantCount = (internshipId) => {
    return applications.filter((a) => a.internshipId === internshipId).length;
  };

  // Selected internship details
  const activeInternship =
    selectedInternshipId === "all"
      ? null
      : companyInternships.find((i) => i.id === selectedInternshipId);

  const handleUpdateStatus = (id, newStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
    if (selectedCandidate && selectedCandidate.id === id) {
      setSelectedCandidate((prev) => ({ ...prev, status: newStatus }));
    }
    // Update backend in background; gracefully falls back if server offline
    applicationService.updateStatus(id, newStatus);
  };

  // Handle Submit New Internship
  const handlePostInternshipSubmit = async (e) => {
    e.preventDefault();
    if (!postForm.role.trim()) return;

    // Validate custom Department
    const resolvedDepartment = isCustomDepartment
      ? customDepartment.trim()
      : postForm.department.trim();

    if (!resolvedDepartment) {
      setFormErrors((prev) => ({
        ...prev,
        department: "Please enter a custom department name.",
      }));
      return;
    }

    // Validate custom Track
    const resolvedTrack = isCustomTrack
      ? customTrack.trim()
      : postForm.track.trim();

    if (!resolvedTrack) {
      setFormErrors((prev) => ({
        ...prev,
        track: "Please enter a custom track name.",
      }));
      return;
    }

    setFormErrors({});
    setPostingLoading(true);

    const skillsArray = postForm.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const newInternshipObj = {
      id: `int-${Date.now()}`,
      role: postForm.role.trim(),
      company: currentUser?.companyProfile?.companyName || currentUser?.name || "Partner Company",
      location: postForm.location || "Remote",
      mode: postForm.mode,
      stipend: postForm.stipend || "Competitive Stipend",
      duration: postForm.duration || "3 Months",
      department: resolvedDepartment,
      track: resolvedTrack,
      skills: skillsArray,
      status: "active",
      postedDate: "Just now",
      description: postForm.description || "Internship opening building modern applications.",
    };

    try {
      const created = await apiRequest("/internships", "POST", {
        role: newInternshipObj.role,
        company: newInternshipObj.company,
        location: newInternshipObj.location,
        mode: newInternshipObj.mode.toLowerCase(),
        stipend: newInternshipObj.stipend,
        duration: newInternshipObj.duration,
        description: newInternshipObj.description,
        skills: skillsArray,
        department: resolvedDepartment,
        track: resolvedTrack,
      });

      const savedInternship = created?.data?.internship || created?.data || newInternshipObj;
      setCompanyInternships((prev) => [savedInternship, ...prev]);
      setSelectedInternshipId(savedInternship._id || savedInternship.id);
      setSelectedTab("All");
      handleClosePostModal();

      // Show success toast
      setSuccessToast(`"${savedInternship.role || newInternshipObj.role}" posted successfully!`);
      setTimeout(() => setSuccessToast(""), 4000);
    } catch (err) {
      alert(err.message || "Failed to post internship to database. Please try again.");
    } finally {
      setPostingLoading(false);
    }

    // Reset form
    setPostForm({
      role: "",
      department: "Engineering",
      track: "Development",
      mode: "remote",
      location: "Remote",
      stipend: "₹25,000 / month",
      duration: "3 Months",
      skills: "React, Node.js, TypeScript",
      description: "",
    });
    setCustomDepartment("");
    setCustomTrack("");
    setIsCustomDepartment(false);
    setIsCustomTrack(false);
    setFormErrors({});
  };

  return (
    <div className="min-h-screen bg-[#F7F9F9] flex">
      <DashboardSidebar />

      <div className="flex-1 md:ml-[220px] ml-0 flex flex-col min-h-screen relative">
        <DashboardHeader />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Success Toast */}
          {successToast && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500 text-white shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold">{successToast}</span>
              </div>
              <button
                onClick={() => setSuccessToast("")}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Header Title with Primary Post Internship Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Applications Tracking (ATS)
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                View candidate applications filtered by internship opening and manage hiring stages
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPostModal(true)}
                id="ats-post-internship-btn"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#009689] hover:bg-[#007e73] active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#009689]/20 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Post Internship</span>
              </button>

              <span className="text-xs font-semibold px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-700 shadow-2xs shrink-0">
                {applications.length} Total Applicants
              </span>
            </div>
          </div>

          {/* ──── Internship Filter Selector ──── */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#4B9C93]" />
                <span className="text-xs sm:text-sm font-bold text-gray-800">
                  Select Internship Opening:
                </span>
              </div>

              {/* Quick Dropdown on Mobile / Compact screens */}
              <div className="relative sm:w-72 w-full">
                <select
                  value={selectedInternshipId}
                  onChange={(e) => {
                    setSelectedInternshipId(e.target.value);
                    setSelectedTab("All");
                  }}
                  id="internship-filter-select"
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 cursor-pointer focus:outline-none focus:border-[#4B9C93] focus:bg-white transition-all"
                >
                  <option value="all">
                    All Openings ({applications.length} applicants total)
                  </option>
                  {companyInternships.map((int) => (
                    <option key={int.id} value={int.id}>
                      {int.role} ({getInternshipApplicantCount(int.id)} applicants)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Horizontal Scrollable Internship Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedInternshipId("all");
                  setSelectedTab("All");
                }}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition-all font-semibold cursor-pointer flex items-center gap-2 ${
                  selectedInternshipId === "all"
                    ? "bg-[#4B9C93] text-white shadow-xs font-bold"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Internships</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    selectedInternshipId === "all"
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {applications.length}
                </span>
              </button>

              {companyInternships.map((int) => {
                const count = getInternshipApplicantCount(int.id);
                const active = selectedInternshipId === int.id;
                return (
                  <button
                    key={int.id}
                    type="button"
                    onClick={() => {
                      setSelectedInternshipId(int.id);
                      setSelectedTab("All");
                    }}
                    className={`px-3.5 py-2 rounded-xl shrink-0 transition-all font-semibold cursor-pointer flex items-center gap-2 ${
                      active
                        ? "bg-[#4B9C93] text-white shadow-xs font-bold ring-2 ring-[#4B9C93]/30"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
                    }`}
                  >
                    <span className="truncate max-w-[200px]">{int.role}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Internship Context Banner */}
            {activeInternship && (
              <div className="bg-[#E6F7F3]/40 border border-[#4B9C93]/20 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-700">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="font-bold text-gray-900 text-sm">
                    {activeInternship.role}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <Check className="w-3 h-3" />
                    Active Posting
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {activeInternship.location} ({activeInternship.mode})
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Banknote className="w-3.5 h-3.5 text-gray-400" />
                    {activeInternship.stipend}
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {activeInternship.duration}
                  </span>
                  {(activeInternship.department || activeInternship.track) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#4B9C93]/10 text-[#2c6e66]">
                      {activeInternship.department}
                      {activeInternship.department && activeInternship.track ? " • " : ""}
                      {activeInternship.track}
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-semibold text-[#4B9C93] shrink-0">
                  Showing {filteredApplications.length} applicants for this opening
                </div>
              </div>
            )}
          </div>

          {/* Search & Pipeline Stage Tabs */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative flex items-center bg-[#F9FAFB] border border-[#E5E6E5] rounded-xl px-4 py-2.5 focus-within:border-[#4B9C93] focus-within:bg-white transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by candidate name, college, or skills..."
                  className="w-full bg-transparent pl-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Stage Tabs Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
              {statusTabs.map((tab) => {
                const relevantApps =
                  selectedInternshipId === "all"
                    ? applications
                    : applications.filter((a) => a.internshipId === selectedInternshipId);
                const count =
                  tab === "All"
                    ? relevantApps.length
                    : relevantApps.filter((a) => a.status.toLowerCase() === tab.toLowerCase()).length;
                const active = selectedTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedTab(tab)}
                    className={`px-3.5 py-1.5 rounded-full shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? "bg-[#4B9C93] text-white shadow-xs font-bold"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200/80"
                    }`}
                  >
                    <span>{tab}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ──── Applications Candidate Cards Grid ──── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApplications.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs hover:border-[#4B9C93]/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={candidate.avatar}
                        alt={candidate.name}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{candidate.name}</h4>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px]">{candidate.college}</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E6F7F3] text-[#4B9C93]">
                      <CheckCircle2 className="w-3 h-3" />
                      {candidate.score}%
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="inline-block text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 mb-1">
                      {candidate.role}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Applied on {candidate.appliedDate}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {candidate.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <select
                    value={candidate.status}
                    onChange={(e) => handleUpdateStatus(candidate.id, e.target.value)}
                    className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 cursor-pointer focus:outline-none focus:border-[#4B9C93]"
                  >
                    <option value="Applied">Applied</option>
                    <option value="Reviewing">Reviewing</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Interviewing">Interviewing</option>
                    <option value="Hired">Hired</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/company/chats?user=${candidate.id}`}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#4B9C93] hover:bg-[#E6F7F3] transition-colors"
                      title="Send Message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSelectedCandidate(candidate)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4B9C93] text-white hover:bg-[#3d867e] transition-colors cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredApplications.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs max-w-xl mx-auto my-6">
              <div className="w-14 h-14 rounded-full bg-[#E6F7F3] text-[#4B9C93] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {selectedInternshipId !== "all"
                  ? `No applicants yet for ${activeInternship?.role}`
                  : "No applicants match your filter criteria"}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
                {selectedInternshipId !== "all"
                  ? "This internship posting is live on the candidate discovery feed. As students apply, their scored portfolios will appear here."
                  : "Try clearing search queries or selecting another pipeline stage tab."}
              </p>
              <div className="flex items-center justify-center gap-3">
                {selectedInternshipId !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedInternshipId("all")}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    View All Internships
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPostModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4B9C93] text-white hover:bg-[#3d867e] transition-colors"
                >
                  Post New Opening
                </button>
              </div>
            </div>
          )}

          {/* ──── Candidate Detail Modal ──── */}
          {selectedCandidate && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={selectedCandidate.avatar}
                    alt={selectedCandidate.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#4B9C93]/30"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedCandidate.name}</h3>
                    <p className="text-xs text-gray-500">{selectedCandidate.college}</p>
                    <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E6F7F3] text-[#4B9C93]">
                      Applied for: {selectedCandidate.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 py-3 border-y border-gray-100 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedCandidate.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{selectedCandidate.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                    <a
                      href={selectedCandidate.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#4B9C93] hover:underline font-semibold"
                    >
                      {selectedCandidate.portfolioUrl}
                    </a>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="font-bold text-gray-700 block mb-1">Recruiter Notes:</span>
                    <p className="text-gray-500 leading-relaxed">{selectedCandidate.notes}</p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-3">
                  <Link
                    href={`/company/chats?user=${selectedCandidate.id}`}
                    className="flex-1 py-2 text-center rounded-xl bg-[#4B9C93] text-white text-xs font-bold hover:bg-[#3d867e] transition-colors"
                  >
                    Open Chat Thread
                  </Link>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──── Post New Internship Modal ──── */}
          {showPostModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative my-8 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={handleClosePostModal}
                  className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F7F3] text-[#4B9C93] text-xs font-bold mb-2">
                    <Briefcase className="w-3.5 h-3.5" />
                    Recruiter Job Creator
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Post New Internship Opportunity
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Publish your role to campus students across top engineering institutions.
                  </p>
                </div>

                <form onSubmit={handlePostInternshipSubmit} className="space-y-4">
                  {/* Role Title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Internship Role Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cloud & DevOps Engineer Intern"
                      value={postForm.role}
                      onChange={(e) => setPostForm({ ...postForm, role: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Grid: Department & Track */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="post-department-select" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Department *
                      </label>
                      <select
                        id="post-department-select"
                        value={postForm.department}
                        onChange={handleDepartmentChange}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] focus:bg-white transition-all cursor-pointer"
                      >
                        {PREDEFINED_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                        <option value="custom">+ Custom Department...</option>
                      </select>
                      {isCustomDepartment && (
                        <div className="mt-2 space-y-1">
                          <input
                            type="text"
                            id="custom-department-input"
                            placeholder="Enter custom department (e.g. Operations, Legal, Finance)"
                            value={customDepartment}
                            onChange={(e) => {
                              setCustomDepartment(e.target.value);
                              if (formErrors.department) {
                                setFormErrors((prev) => ({ ...prev, department: "" }));
                              }
                            }}
                            className={`w-full h-11 px-3.5 rounded-xl border ${
                              formErrors.department
                                ? "border-red-400 bg-red-50/30"
                                : "border-gray-200 bg-white"
                            } text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] transition-all`}
                          />
                          {formErrors.department && (
                            <p className="text-[11px] text-red-500 font-medium">
                              {formErrors.department}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="post-track-select" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Track *
                      </label>
                      <select
                        id="post-track-select"
                        value={postForm.track}
                        onChange={handleTrackChange}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] focus:bg-white transition-all cursor-pointer"
                      >
                        {PREDEFINED_TRACKS.map((trk) => (
                          <option key={trk} value={trk}>
                            {trk}
                          </option>
                        ))}
                        <option value="custom">+ Custom Track...</option>
                      </select>
                      {isCustomTrack && (
                        <div className="mt-2 space-y-1">
                          <input
                            type="text"
                            id="custom-track-input"
                            placeholder="Enter custom track (e.g. Cloud & DevOps, Quant Trading)"
                            value={customTrack}
                            onChange={(e) => {
                              setCustomTrack(e.target.value);
                              if (formErrors.track) {
                                setFormErrors((prev) => ({ ...prev, track: "" }));
                              }
                            }}
                            className={`w-full h-11 px-3.5 rounded-xl border ${
                              formErrors.track
                                ? "border-red-400 bg-red-50/30"
                                : "border-gray-200 bg-white"
                            } text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] transition-all`}
                          />
                          {formErrors.track && (
                            <p className="text-[11px] text-red-500 font-medium">
                              {formErrors.track}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid: Work Modality & Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Work Modality
                      </label>
                      <select
                        value={postForm.mode}
                        onChange={(e) => setPostForm({ ...postForm, mode: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] focus:bg-white transition-all cursor-pointer"
                      >
                        <option value="remote">Remote (Anywhere)</option>
                        <option value="hybrid">Hybrid (Office + Remote)</option>
                        <option value="onsite">Onsite (Full Office)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru, India or Remote"
                        value={postForm.location}
                        onChange={(e) => setPostForm({ ...postForm, location: e.target.value })}
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Grid: Monthly Stipend & Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Monthly Stipend
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ₹25,000 / month"
                        value={postForm.stipend}
                        onChange={(e) => setPostForm({ ...postForm, stipend: e.target.value })}
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Internship Duration
                      </label>
                      <select
                        value={postForm.duration}
                        onChange={(e) => setPostForm({ ...postForm, duration: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] focus:bg-white transition-all cursor-pointer"
                      >
                        <option value="2 Months">2 Months</option>
                        <option value="3 Months">3 Months</option>
                        <option value="4 Months">4 Months</option>
                        <option value="6 Months">6 Months</option>
                      </select>
                    </div>
                  </div>

                  {/* Required Skills */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Required Skills (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. React, Docker, Python"
                      value={postForm.skills}
                      onChange={(e) => setPostForm({ ...postForm, skills: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Role Overview & Responsibilities
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe what the student will work on, learning goals, and team environment..."
                      value={postForm.description}
                      onChange={(e) => setPostForm({ ...postForm, description: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-[#4B9C93] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleClosePostModal}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={postingLoading}
                      className="px-6 py-2.5 rounded-xl bg-[#009689] hover:bg-[#007e73] active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#009689]/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-70"
                    >
                      {postingLoading ? (
                        <>Publishing Opening...</>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          Publish Internship
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function CompanyApplicationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[#4B9C93] font-bold">Loading ATS...</div>}>
      <CompanyApplicationsContent />
    </Suspense>
  );
}
