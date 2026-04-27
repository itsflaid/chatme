import { Message } from "@prisma/client";
import { IoCheckmarkDone } from "react-icons/io5";

type Props = {
  message: Message;
};

export default function MessageBubble({ message }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col items-end">
      {/* Bubble */}
      <div
        className="max-w-[82%] rounded-[18px_18px_4px_18px] px-4 py-2.5 border border-[var(--border)]"
        style={{
          background: message.isDone ? "var(--surface)" : "var(--surface2)",
          opacity: message.isDone ? 0.5 : 1,
        }}
      >
        <p
          className="text-sm leading-relaxed break-words text-[var(--text)]"
          style={{
            textDecoration: message.isDone ? "line-through" : "none",
          }}
        >
          {message.text}
        </p>

        {/* remind tetap di dalam bubble */}
        {message.remindAt && (
          <span className="text-[10px] flex items-center gap-1 text-[var(--accent3)] mt-1">
            🔔{" "}
            {new Date(message.remindAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Time + Check (dipindah keluar bubble) */}
      <div className="flex items-center gap-1 mt-1 pr-1">
        <span className="text-[10px] text-[var(--text3)] tabular-nums">
          {time}
        </span>

        <IoCheckmarkDone
          size={16}
          className={`transition-all ${
            message.isDone
              ? "text-[var(--accent)]"
              : "text-[var(--text3)]"
          }`}
        />
      </div>
    </div>
  );
}