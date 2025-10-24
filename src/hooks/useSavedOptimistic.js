import { useCallback, useEffect, useMemo, useState } from "react";
import useSavedProducts from "./useSavedProducts";

export default function useSavedOptimistic() {
  const { user, savedIds, toggleSave, loadingUser, loadingSaved } = useSavedProducts();

  // 항상 Set 보장
  const savedSet = useMemo(
    () => (savedIds instanceof Set ? savedIds : new Set(savedIds || [])),
    [savedIds]
  );

  // id -> boolean(임시)  / 없으면 savedSet 기준
  const [optimistic, setOptimistic] = useState(() => new Map());
  const isSavedUI = useCallback(
    (id) => (optimistic.has(id) ? optimistic.get(id) : savedSet.has(id)),
    [optimistic, savedSet]
  );

  const toggleSavedUI = useCallback(
    async (id, e) => {
      e?.stopPropagation?.();
      const next = !isSavedUI(id);
      setOptimistic((prev) => {
        const m = new Map(prev);
        m.set(id, next);
        return m;
      });
      try {
        await toggleSave(id);
      } catch (err) {
        alert(err?.message || "Failed to save");
      } finally {
        // 컨텍스트 반영되면 임시값 제거
        setOptimistic((prev) => {
          const m = new Map(prev);
          m.delete(id);
          return m;
        });
      }
    },
    [isSavedUI, toggleSave]
  );

  // savedSet 변하면 임시값 비워 수렴
  useEffect(() => {
    if (optimistic.size === 0) return;
    setOptimistic(new Map());
  }, [savedSet]); // eslint-disable-line react-hooks/exhaustive-deps

  return { user, loadingUser, loadingSaved, savedSet, isSavedUI, toggleSavedUI };
}
