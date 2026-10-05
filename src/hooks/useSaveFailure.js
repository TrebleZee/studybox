import { useEffect, useState } from "react";
import { subscribe } from "../store/index.js";

// True while any key's last write failed (storage full or blocked). A key
// clears on its next successful write.
export default function useSaveFailure() {
  const [failed, setFailed] = useState(() => new Set());

  useEffect(
    () =>
      subscribe(({ key, type }) => {
        if (type === "error") {
          setFailed((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
        } else if (type === "write" || type === "remove") {
          setFailed((prev) => {
            if (!prev.has(key)) return prev;
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      }),
    []
  );

  return failed.size > 0;
}
