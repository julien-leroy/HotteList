import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NotificationMenu } from "./notification-menu";

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
      items={items.map((n) => ({ id: n.id, text: n.text, link: n.link, unread: !n.readAt, createdAt: n.createdAt.toISOString() }))}
    />
  );
}
