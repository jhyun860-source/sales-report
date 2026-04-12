/**
 * MemoEditor - 모바일/PC 완전 호환 형광펜 메모 컴포넌트
 *
 * 설계 원칙:
 * - 입력은 항상 표준 textarea (모바일 한국어 IME 완전 호환)
 * - 형광펜은 "색상 선택 → 이후 입력 내용에 자동 적용" 방식
 * - 내부 상태: Part[] = { text: string, color: string | null }[]
 * - 저장값: JSON.stringify(parts) → DB 저장
 *
 * 핵심 단순화:
 * - textarea의 onChange에서 전체 텍스트를 받아 처리
 * - 이전 텍스트와 비교해 변경 위치를 찾는 복잡한 diff 로직 제거
 * - 대신: 현재 커서 위치(selectionStart)를 기준으로 처리
 * - 한국어 IME 조합 중에는 composing 플래그로 처리 보류
 */

import { useRef, useState, useCallback, useEffect } from 'react';

const COLORS = [
  { id: 'yellow', label: '노랑', bg: '#FFE066' },
  { id: 'green',  label: '초록', bg: '#B8F5B0' },
  { id: 'pink',   label: '분홍', bg: '#FFB3D1' },
  { id: 'blue',   label: '파랑', bg: '#A8D8FF' },
];

type Part = { text: string; color: string | null };

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textColor?: string;
  borderColor?: string;
};

function parseParts(value: string): Part[] {
  if (!value) return [];
  try {
    const p = JSON.parse(value);
    if (Array.isArray(p) && p.every((x: any) => typeof x.text === 'string')) return p;
  } catch {}
  // 구형 HTML 또는 순수 텍스트
  const text = value
    .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return text ? [{ text, color: null }] : [];
}

function partsToText(parts: Part[]): string {
  return parts.map(p => p.text).join('');
}

function mergeParts(parts: Part[]): Part[] {
  const out: Part[] = [];
  for (const p of parts) {
    if (!p.text) continue;
    if (out.length && out[out.length - 1].color === p.color) {
      out[out.length - 1] = { text: out[out.length - 1].text + p.text, color: p.color };
    } else {
      out.push({ ...p });
    }
  }
  return out;
}

export function MemoEditor({ value, onChange, placeholder = '주문 메모', textColor = '#1a1a1a', borderColor = '#d0c8b0' }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [parts, setParts] = useState<Part[]>(() => parseParts(value));
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 외부 value 변경 시 동기화 (포커스 없을 때만)
  const lastValueRef = useRef(value);
  useEffect(() => {
    if (!isFocused && value !== lastValueRef.current) {
      lastValueRef.current = value;
      setParts(parseParts(value));
    }
  }, [value, isFocused]);

  // 색상 버튼 클릭
  const handleColorClick = (colorId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveColor(prev => prev === colorId ? null : colorId);
    setTimeout(() => taRef.current?.focus(), 0);
  };

  // 형광펜 전체 제거
  const removeAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = partsToText(parts);
    const newParts: Part[] = text ? [{ text, color: null }] : [];
    setParts(newParts);
    lastValueRef.current = JSON.stringify(newParts);
    onChange(JSON.stringify(newParts));
    setActiveColor(null);
  };

  // textarea 변경 처리 - 단순하고 안정적인 방식
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newFullText = e.target.value;
    const oldFullText = partsToText(parts);

    if (newFullText === oldFullText) return;

    // 변경이 없으면 무시
    if (newFullText.length === 0) {
      const newParts: Part[] = [];
      setParts(newParts);
      lastValueRef.current = JSON.stringify(newParts);
      onChange(JSON.stringify(newParts));
      return;
    }

    // 커서 위치 기반으로 변경 처리
    const ta = e.target;
    const cursorPos = ta.selectionStart ?? newFullText.length;
    const oldLen = oldFullText.length;
    const newLen = newFullText.length;
    const diff = newLen - oldLen;

    let newParts: Part[];

    if (diff > 0) {
      // 텍스트 추가: 커서 위치에서 diff 글자만큼 추가됨
      const insertEnd = cursorPos;
      const insertStart = cursorPos - diff;
      const inserted = newFullText.slice(insertStart, insertEnd);

      newParts = insertIntoParts(parts, insertStart, inserted, activeColor);
    } else if (diff < 0) {
      // 텍스트 삭제: 커서 위치에서 |diff| 글자 삭제됨
      const deleteEnd = cursorPos - diff; // cursorPos + |diff|
      const deleteStart = cursorPos;
      // 실제 삭제된 범위를 oldFullText 기준으로 계산
      // 앞에서 공통 부분
      let cs = 0;
      while (cs < newLen && cs < oldLen && newFullText[cs] === oldFullText[cs]) cs++;
      // 뒤에서 공통 부분
      let ce = 0;
      while (ce < oldLen - cs && ce < newLen - cs && oldFullText[oldLen - 1 - ce] === newFullText[newLen - 1 - ce]) ce++;
      const ds = cs;
      const de = oldLen - ce;

      newParts = deleteFromParts(parts, ds, de);
    } else {
      // 같은 길이 (교체): 앞뒤 공통 부분 찾아서 중간 교체
      let cs = 0;
      while (cs < newLen && oldFullText[cs] === newFullText[cs]) cs++;
      let ce = 0;
      while (ce < newLen - cs && oldFullText[oldLen - 1 - ce] === newFullText[newLen - 1 - ce]) ce++;
      const ds = cs;
      const de = oldLen - ce;
      const inserted = newFullText.slice(cs, newLen - ce);

      const afterDel = deleteFromParts(parts, ds, de);
      newParts = insertIntoParts(afterDel, ds, inserted, activeColor);
    }

    newParts = mergeParts(newParts);
    setParts(newParts);
    const serialized = JSON.stringify(newParts);
    lastValueRef.current = serialized;
    onChange(serialized);
  }, [parts, activeColor, onChange]);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const fullText = partsToText(parts);
  const hasContent = fullText.length > 0;
  const hasHighlight = parts.some(p => p.color !== null);

  return (
    <div className="relative w-full">
      {/* 형광펜 색상 선택 툴바 */}
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span style={{ color: `${textColor}60`, fontSize: '10px' }}>형광펜:</span>
        {COLORS.map(c => (
          <button
            key={c.id}
            type="button"
            onMouseDown={e => handleColorClick(c.id, e)}
            className="w-5 h-5 rounded-full flex-shrink-0"
            style={{
              background: c.bg,
              border: activeColor === c.id ? '2.5px solid #333' : '1.5px solid #bbb',
              transform: activeColor === c.id ? 'scale(1.3)' : 'scale(1)',
              transition: 'transform 0.1s',
            }}
            title={c.label}
          />
        ))}
        {activeColor && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setActiveColor(null); setTimeout(() => taRef.current?.focus(), 0); }}
            style={{ fontSize: '10px', padding: '1px 6px', background: '#eee', border: '1px solid #ccc', borderRadius: '3px', color: '#555' }}
          >
            끄기
          </button>
        )}
        {hasHighlight && (
          <button
            type="button"
            onMouseDown={removeAll}
            style={{ fontSize: '10px', padding: '1px 5px', background: '#eee', border: '1px solid #ccc', borderRadius: '3px', color: '#888' }}
            title="형광펜 모두 지우기"
          >
            ✕
          </button>
        )}
      </div>

      {/* 렌더링 표시 + 투명 textarea 오버레이 */}
      <div
        className="relative w-full"
        style={{ borderBottom: `1px solid ${borderColor}`, paddingBottom: '2px' }}
      >
        {/* 시각적 표시 영역 */}
        <div
          className="w-full min-h-[28px] text-xs leading-relaxed pointer-events-none"
          style={{
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
            color: textColor,
          }}
          aria-hidden
        >
          {hasContent ? (
            parts.map((p, i) =>
              p.color ? (
                <span key={i} style={{ background: COLORS.find(c => c.id === p.color)?.bg ?? '#FFE066', borderRadius: '2px', padding: '0 1px' }}>
                  {p.text}
                </span>
              ) : (
                <span key={i}>{p.text}</span>
              )
            )
          ) : (
            <span style={{ color: `${textColor}45` }}>{placeholder}</span>
          )}
          {/* 텍스트가 있을 때 최소 높이 확보용 공백 */}
          {hasContent && <span style={{ opacity: 0 }}>​</span>}
        </div>

        {/* 투명 textarea - 실제 입력 */}
        <textarea
          ref={taRef}
          value={fullText}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          rows={1}
          placeholder={hasContent ? '' : placeholder}
          className="absolute inset-0 w-full h-full resize-none outline-none"
          style={{
            fontSize: '12px',
            lineHeight: '1.625',
            background: 'transparent',
            color: 'transparent',
            caretColor: textColor,
            padding: '0',
            border: 'none',
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  );
}

// parts 배열의 pos 위치에 text 삽입
function insertIntoParts(parts: Part[], pos: number, text: string, color: string | null): Part[] {
  if (!text) return parts;
  if (parts.length === 0) return [{ text, color }];

  const result: Part[] = [];
  let offset = 0;
  let inserted = false;

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const pEnd = offset + p.text.length;

    if (!inserted && pos <= pEnd) {
      const localPos = pos - offset;
      const before = p.text.slice(0, localPos);
      const after = p.text.slice(localPos);

      if (before) result.push({ text: before, color: p.color });
      result.push({ text, color });
      if (after) result.push({ text: after, color: p.color });
      inserted = true;
    } else {
      result.push(p);
    }

    offset = pEnd;
  }

  if (!inserted) {
    result.push({ text, color });
  }

  return result;
}

// parts 배열에서 [start, end) 범위 삭제
function deleteFromParts(parts: Part[], start: number, end: number): Part[] {
  if (start >= end) return parts;

  const result: Part[] = [];
  let offset = 0;

  for (const p of parts) {
    const pStart = offset;
    const pEnd = offset + p.text.length;

    if (pEnd <= start || pStart >= end) {
      result.push(p);
    } else {
      const keepBefore = p.text.slice(0, Math.max(0, start - pStart));
      const keepAfter = p.text.slice(Math.min(p.text.length, end - pStart));
      if (keepBefore) result.push({ text: keepBefore, color: p.color });
      if (keepAfter) result.push({ text: keepAfter, color: p.color });
    }

    offset = pEnd;
  }

  return result;
}
