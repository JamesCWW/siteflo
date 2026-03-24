import { NotificationsClient } from './notifications-client';
import { getCustomersForNotification } from '@/actions/notifications';

export default async function NotificationsPage() {
  const result = await getCustomersForNotification();
  const customerList = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send a message to multiple customers at once.
        </p>
      </div>
      <NotificationsClient customers={customerList} />
    </div>
  );
}
