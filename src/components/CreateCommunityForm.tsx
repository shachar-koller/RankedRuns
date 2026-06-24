import { createCommunity } from "@/actions/communities";

const communityTypes = [
  ["university", "University"],
  ["park", "Park"],
  ["shul", "Shul"],
  ["gym", "Gym"],
  ["friend_group", "Friend group"],
  ["other", "Other"],
];

export function CreateCommunityForm() {
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
          <select className="input mt-1" id="visibility" name="visibility" defaultValue="public">
            <option value="public">Public</option>
            <option value="domain_restricted">Domain</option>
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

      <div>
        <label className="label" htmlFor="allowed_email_domain">
          Allowed email domain
        </label>
        <input className="input mt-1" id="allowed_email_domain" name="allowed_email_domain" placeholder="yu.edu" />
      </div>

      <button className="btn-primary w-full" type="submit">
        Create community
      </button>
    </form>
  );
}
