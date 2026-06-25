import { confirmResultReport, disputeResultReport } from "@/actions/challenges";
import { Avatar } from "@/components/Avatar";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { timeAgo } from "@/lib/utils";
import type { ResultReportWithPlayers } from "@/lib/types";

export function ResultReportCard({
  report,
  currentUserId,
}: {
  report: ResultReportWithPlayers;
  currentUserId: string;
}) {
  const submittedByCurrentUser = report.submitted_by === currentUserId;
  const canReview = !submittedByCurrentUser && report.status === "pending";

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={report.winner.display_name} src={report.winner.avatar_url} />
          <div className="min-w-0">
            <p className="truncate font-black">
              {report.winner.display_name} won {report.winner_score}-{report.loser_score}
            </p>
            <p className="text-sm text-slate-500">
              Submitted by {submittedByCurrentUser ? "you" : report.submitter.display_name}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-400">{timeAgo(report.created_at)}</span>
      </div>

      {report.status === "disputed" ? (
        <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
          Disputed{report.dispute_reason ? `: ${report.dispute_reason}` : ""}
        </div>
      ) : null}

      {submittedByCurrentUser && report.status === "pending" ? (
        <div className="mt-4 rounded-xl bg-orange-50 px-3 py-2 text-sm font-semibold text-court">
          Waiting for the other player to confirm.
        </div>
      ) : null}

      {canReview ? (
        <div className="mt-4 grid gap-3">
          <form action={confirmResultReport}>
            <input name="result_report_id" type="hidden" value={report.id} />
            <FormSubmitButton pendingLabel="Confirming score...">
              Confirm score
            </FormSubmitButton>
          </form>
          <form action={disputeResultReport} className="grid gap-2">
            <input name="result_report_id" type="hidden" value={report.id} />
            <label>
              <span className="label">Reason, optional</span>
              <input
                className="input mt-1"
                maxLength={180}
                name="reason"
                placeholder="Example: score was 11-8, not 11-6"
              />
            </label>
            <FormSubmitButton
              className="btn-secondary w-full"
              confirmMessage="Dispute this score? Rankings will stay unchanged until it is resolved."
              pendingLabel="Disputing score..."
            >
              Dispute score
            </FormSubmitButton>
          </form>
        </div>
      ) : null}
    </article>
  );
}
