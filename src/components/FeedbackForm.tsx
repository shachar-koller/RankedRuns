"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { submitFeedbackAction, type FeedbackActionState } from "@/actions/feedback";

const initialState: FeedbackActionState = {};

export function FeedbackForm({ communityId }: { communityId?: string | null }) {
  const pathname = usePathname();
  const [state, formAction, isPending] = useActionState(submitFeedbackAction, initialState);

  return (
    <div className="card p-5">
      <h3 className="font-black">Feedback</h3>
      <p className="mt-1 text-sm text-slate-500">Send bugs, complaints, feature ideas, or confusing behavior.</p>
      <form action={formAction} className="mt-4 space-y-3">
        <input name="community_id" type="hidden" value={communityId ?? ""} />
        <input name="screen" type="hidden" value={pathname} />
        <label>
          <span className="label">Type</span>
          <select className="input mt-1 font-semibold" name="type" defaultValue="bug">
            <option value="bug">Bug</option>
            <option value="complaint">Complaint</option>
            <option value="feature_request">Feature request</option>
            <option value="confusing_behavior">Confusing behavior</option>
            <option value="general">General</option>
          </select>
        </label>
        <label>
          <span className="label">Details</span>
          <textarea
            className="input mt-1 min-h-28 resize-none leading-6"
            maxLength={1000}
            name="message"
            placeholder="What happened?"
            required
          />
        </label>
        {state.ok ? <p className="text-sm font-bold text-emerald-600">{state.ok}</p> : null}
        {state.error ? <p className="text-sm font-bold text-red-500">{state.error}</p> : null}
        <button className="btn-primary w-full" disabled={isPending} type="submit">
          {isPending ? "Sending..." : "Send feedback"}
        </button>
      </form>
    </div>
  );
}
