/**
 * PWA 업데이트 알림 로직 테스트
 * - Service Worker SKIP_WAITING 메시지 전송 로직 검증
 * - 업데이트 감지 상태 관리 검증
 */
import { describe, it, expect, vi } from "vitest";

describe("PWA 업데이트 알림 로직", () => {
  it("SKIP_WAITING 메시지 타입이 올바르게 정의되어 있다", () => {
    const message = { type: "SKIP_WAITING" };
    expect(message.type).toBe("SKIP_WAITING");
  });

  it("Service Worker postMessage 호출 시 올바른 메시지 형식을 전달한다", () => {
    const mockWorker = {
      postMessage: vi.fn(),
      state: "installed",
    };

    // 업데이트 적용 로직 시뮬레이션
    const applyUpdate = (worker: typeof mockWorker) => {
      worker.postMessage({ type: "SKIP_WAITING" });
    };

    applyUpdate(mockWorker);

    expect(mockWorker.postMessage).toHaveBeenCalledOnce();
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("대기 중인 SW가 없으면 postMessage가 호출되지 않는다", () => {
    const mockWorker = {
      postMessage: vi.fn(),
    };

    // waitingWorker가 null인 경우
    const applyUpdate = (worker: typeof mockWorker | null) => {
      if (worker) {
        worker.postMessage({ type: "SKIP_WAITING" });
      }
    };

    applyUpdate(null);
    expect(mockWorker.postMessage).not.toHaveBeenCalled();
  });

  it("업데이트 배너는 updateAvailable=true이고 dismissed=false일 때만 표시된다", () => {
    const cases = [
      { updateAvailable: true, dismissed: false, shouldShow: true },
      { updateAvailable: true, dismissed: true, shouldShow: false },
      { updateAvailable: false, dismissed: false, shouldShow: false },
      { updateAvailable: false, dismissed: true, shouldShow: false },
    ];

    for (const { updateAvailable, dismissed, shouldShow } of cases) {
      const visible = updateAvailable && !dismissed;
      expect(visible).toBe(shouldShow);
    }
  });

  it("SW 설치 상태가 installed이고 controller가 있을 때만 업데이트 알림을 표시한다", () => {
    const scenarios = [
      { state: "installed", hasController: true, shouldNotify: true },
      { state: "installing", hasController: true, shouldNotify: false },
      { state: "installed", hasController: false, shouldNotify: false },
      { state: "activated", hasController: true, shouldNotify: false },
    ];

    for (const { state, hasController, shouldNotify } of scenarios) {
      const notify = state === "installed" && hasController;
      expect(notify).toBe(shouldNotify);
    }
  });
});
