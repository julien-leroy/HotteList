import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NotificationMenu } from "./notification-menu";
import { mailEnabled } from "@/lib/mail";

export async function NotificationBell() {
  const user = await getCurrentUser();
  if (!user) return null;
  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return (
    <NotificationMenu
      // « Me notifier par e-mail » : pour un invité (créer son compte) ou un compte sans adresse confirmée
      emailHref={!mailEnabled() || user.hasEmail ? null : "/creer-mon-compte?pour=notifications"}
      items={items.map((n) => ({ id: n.id, text: n.text, link: n.link, unread: !n.readAt, createdAt: n.createdAt.toISOString() }))}
    />
  );
}
