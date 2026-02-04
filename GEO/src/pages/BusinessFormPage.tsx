import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { BusinessDetails } from "../types";
import { createBusinessProfile, APIError } from "../utils/api";

type BusinessFormPageProps = {
  onSubmit: (details: BusinessDetails) => void;
  onLogout?: () => void;
  initialValues?: BusinessDetails | null;
};

const emptyDetails: BusinessDetails = {
  name: "",
  category: "",
  primaryLocation: "",
  website: "",
  brandVoice: "",
  mainGoal: "",
};

export default function BusinessFormPage({
  onSubmit,
  onLogout,
  initialValues,
}: BusinessFormPageProps) {
  const [details, setDetails] = useState<BusinessDetails>(
    initialValues ?? emptyDetails
  );
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isSubmitDisabled = useMemo(() => {
    return (
      !details.name.trim() ||
      !details.category.trim() ||
      !details.primaryLocation.trim() ||
      isLoading
    );
  }, [details, isLoading]);

  const handleChange =
    (field: keyof BusinessDetails) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDetails((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (isSubmitDisabled) {
      setFormError(
        "⚠️ Please fill in at least the Business Name, Category, and Primary Location."
      );
      return;
    }

    setIsLoading(true);

    try {
      // Call backend API to create business profile
      const response = await createBusinessProfile({
        name: details.name.trim(),
        category: details.category.trim(),
        primary_location: details.primaryLocation.trim(),
        website: details.website.trim(),
        brand_voice: details.brandVoice.trim(),
        main_goal: details.mainGoal.trim(),
      });

      // Profile created successfully with entity_id
      console.log("Business profile created:", response.profile.id);

      // Call parent onSubmit handler
      onSubmit({
        ...details,
        name: details.name.trim(),
        category: details.category.trim(),
        primaryLocation: details.primaryLocation.trim(),
        website: details.website.trim(),
        brandVoice: details.brandVoice.trim(),
        mainGoal: details.mainGoal.trim(),
      });
    } catch (error) {
      console.error("Failed to create business profile:", error);

      if (error instanceof APIError) {
        if (error.status === 400) {
          setFormError("Invalid business profile data. Please check your inputs.");
        } else if (error.status === 401) {
          setFormError("Session expired. Please login again.");
        } else if (error.status === 409) {
          setFormError("Business profile already exists.");
        } else {
          setFormError(`Failed to create profile: ${error.message}`);
        }
      } else {
        setFormError("Network error. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-gray-300 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-400/70">
              Business Profile
            </p>
            <h1 className="text-3xl font-semibold text-indigo-100">
              Tell us about your business
            </h1>
            <p className="text-gray-400">
              We tailor the dashboard insights to match your goals and local
              footprint.
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-indigo-600/20 hover:text-indigo-300 transition"
          >
            Logout
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-indigo-900/40 bg-gradient-to-br from-[#10101a] to-[#0e0e15] p-8 shadow-[0_0_25px_rgba(59,130,246,0.2)] backdrop-blur-sm"
        >
          {formError ? (
            <div className="mb-6 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm text-orange-300">
              {formError}
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label="Business Name"
              required
              placeholder="Geo.ai Studios"
              value={details.name}
              onChange={handleChange("name")}
            />
            <Field
              label="Primary Category"
              required
              placeholder="Digital marketing agency"
              value={details.category}
              onChange={handleChange("category")}
            />
            <Field
              label="Primary Location"
              required
              placeholder="Austin, TX"
              value={details.primaryLocation}
              onChange={handleChange("primaryLocation")}
            />
            <Field
              label="Website"
              placeholder="https://geo.ai"
              value={details.website}
              onChange={handleChange("website")}
            />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <TextArea
              label="Brand Voice"
              placeholder="Friendly, data-backed, trustworthy..."
              value={details.brandVoice}
              onChange={handleChange("brandVoice")}
            />
            <TextArea
              label="Main GEO Goal"
              placeholder="Keep Apple Business Connect fresh, add Q1 reviews, launch voice search content..."
              value={details.mainGoal}
              onChange={handleChange("mainGoal")}
            />
          </div>

          <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500">
              This info drives entity sync suggestions, trust score pins, and
              AI-ready content prompts.
            </p>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="rounded-full border border-indigo-500 px-6 py-3 text-sm font-semibold text-indigo-400 transition hover:bg-indigo-500/20 hover:text-indigo-300 disabled:cursor-not-allowed disabled:border-gray-600 disabled:text-gray-500"
            >
              {isLoading ? "Creating profile..." : "Generate my dashboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
};

function Field({ label, value, onChange, placeholder, required }: FieldProps) {
  return (
    <label className="space-y-2 text-sm text-gray-300">
      <span className="text-xs uppercase tracking-widest text-gray-500">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        className="w-full rounded-2xl border border-gray-700 bg-[#12121a] px-4 py-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
};

function TextArea({ label, value, onChange, placeholder }: TextAreaProps) {
  return (
    <label className="space-y-2 text-sm text-gray-300">
      <span className="text-xs uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <textarea
        rows={4}
        className="w-full rounded-2xl border border-gray-700 bg-[#12121a] px-4 py-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}
