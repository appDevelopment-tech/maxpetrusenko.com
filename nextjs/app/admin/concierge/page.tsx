import { ConciergeInbox } from "@/components/admin/ConciergeInbox";

export const metadata = {
  title: "Inbox",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ConciergeInboxPage() {
  return (
    <div className="container">
      <section className="section">
        <ConciergeInbox />
      </section>
    </div>
  );
}
