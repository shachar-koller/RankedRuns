"use client";

import { useState } from "react";
import { createCommunity } from "@/actions/communities";
import { FormSubmitButton } from "@/components/FormSubmitButton";

const communityTypes = [
  ["university", "University"],
  ["park", "Park"],
  ["shul", "Shul"],
  ["gym", "Gym"],
  ["friend_group", "Friend group"],
  ["other", "Other"],
];

export function CreateCommunityForm() {
  const [visibility, setVisibility] = useState("public");

  return (
    <form action={createCommunity} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input className="input mt-1" id="name" name="name" placeholder="YU 1v1 Rankings" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="type">
            Type
          </label>
          <select className="input mt-1" id="type" name="type" defaultValue="university">
            {communityTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="visibility">
            Visibility
          </label>
          <select
            className="input mt-1"
            id="visibility"
            name="visibility"
            onChange={(event) => setVisibility(event.target.value)}
            value={visibility}
          >
            <option value="public">Public</option>
            <option value="domain_restricted">Email domain</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="join_policy">
          Join policy
        </label>
        <select className="input mt-1" id="join_policy" name="join_policy" defaultValue="instant">
          <option value="instant">Instant join</option>
          <option value="approval_required">Admin approval required</option>
        </select>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Admin approval lets you review requests before people enter the leaderboard.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          className="input mt-1 min-h-24 resize-none"
          id="description"
          name="description"
          placeholder="A ranking for regular runs and bragging rights."
        />
      </div>

      <div>
        <label className="label" htmlFor="location">
          Location
        </label>
        <input className="input mt-1" id="location" name="location" placeholder="New York, NY" />
      </div>

      {visibility === "domain_restricted" ? (
        <div>
          <label className="label" htmlFor="allowed_email_domain">
            Allowed email domain
          </label>
          <input
            className="input mt-1"
            id="allowed_email_domain"
            name="allowed_email_domain"
            placeholder="yu.edu"
            required
          />
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Members must sign in with this email domain to join.
          </p>
        </div>
      ) : null}

      <FormSubmitButton pendingLabel="Creating community...">
        Create community
      </FormSubmitButton>
    </form>
  );
}
