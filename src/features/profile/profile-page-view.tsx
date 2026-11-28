import { KeyVisualBackdrop } from "@/components/key-visual-backdrop";
import { loadProfilePage } from "./load-profile-page";
import type { ProfileFilter } from "./profile-api";
import { ProfileHeader } from "./profile-header";
import { ProfileKudosList } from "./profile-kudos-list";
import { ProfileSendKudoButton } from "./profile-send-kudo-button";
import { ProfileStatsBlock } from "./profile-stats-block";
import { ProfileUnavailableNotice } from "./profile-unavailable-notice";

/**
 * The one profile layout (FR-002; Figma 362:5037 own, 362:5097 teammate) in a
 * 680 px column over the artwork band: header, the teammate's send button,
 * the counts block, then the KUDOS list. Only the actions differ: the owner
 * gets the box figures and "Mở Secret Box", a teammate the send button.
 * The list is keyed by profile and server-rendered filter: another profile, or
 * a refresh that renders another filter, starts it from that server page.
 */
export async function ProfilePageView({ userId, filter, returnPath }: { userId: string; filter: ProfileFilter; returnPath: string }) {
  const result = await loadProfilePage(userId, filter, returnPath);
  return (
    <div className="relative pb-[120px]" data-testid="profile-page">
      <KeyVisualBackdrop visual="profile" fadeFrom={236} />
      <div className="relative mx-auto flex w-[680px] flex-col items-center pt-[103px]">
        {"error" in result ? (
          <ProfileUnavailableNotice />
        ) : (
          <>
            <ProfileHeader profile={result.profile} />
            {!result.profile.isOwner && (
              <div className="mt-8 w-full">
                <ProfileSendKudoButton user={result.profile.user} />
              </div>
            )}
            <div className="mt-16 w-full">
              <ProfileStatsBlock counts={result.profile.counts} isOwner={result.profile.isOwner} />
            </div>
            <ProfileKudosList key={`${userId}:${filter}`} userId={userId} counts={result.profile.counts} initialFilter={filter} initial={result.firstPage} />
          </>
        )}
      </div>
    </div>
  );
}
