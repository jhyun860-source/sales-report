/**
 * MemoEditor - 모바일/PC 완전 호환 형광펜 메모 컴포넌트
 *
 * 핵심 설계:
 * - 입력은 항상 표준 textarea (모바일 한국어 IME 완전 호환)
 * - 형광펜은 "색상 선택 → 이후 입력 내용에 자동 적용" 방식
 * - 내부 상태: Segment[] = { text: string, color: string | null }[]
 * - 표시: 세그먼트를 span으로 렌더링 (색상 있으면 배경색 적용)
 * - 저장: JSON.stringify(segments) → DB 저장, 불러올 때 JSON.parse
 *
 * 동작 원리:
 * 1. 색상 선택 시 activeColor 변경
 * 2. textarea onInput 이벤트에서 전체 텍스트 변화 감지
 * 3. 이전 세그먼트 텍스트와 비교해 새로 추가된 부분을 activeColor 세그먼트로 생성
 * 4. 삭제 시 세그먼트 끝에서부터 제거
 */

import { useRef, useState, useCallback, useEffect } from 'react';

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: '노랑', bg: '#FFE066' },
  { id: 'green',  label: '초록', bg: '#B8F5B0' },
  { id: 'pink',   label: '분홍', bg: '#FFB3D1' },
  { id: 'blue',   label: '파랑', bg: '#A8D8FF' },
];

type Segment = {
  text: string;
  color: string | null; // null = 일반 텍스트
};

type Props = {
  value: string; // JSON 직렬화된 Segment[] 또는 순수 텍스트
  onChange: (value: string) => void;
  placeholder?: string;
  textColor?: string;
  borderColor?: string;
};

// value 문자열 → Segment[] 파싱
function parseValue(value: string): Segment[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every(s => typeof s.text === 'string')) {
      return parsed;
    }
  } catch {}
  // 구형 HTML 또는 순수 텍스트 처리
  const text = value
    .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  return text ? [{ text, color: null }] : [];
}

// Segment[] → 전체 텍스트
function segmentsToText(segments: Segment[]): string {
  return segments.map(s => s.text).join('');
}

export function MemoEditor({
  value,
  onChange,
  placeholder = '주문 메모',
  textColor = '#1a1a1a',
  borderColor = '#d0c8b0',
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [segments, setSegments] = useState<Segment[]>(() => parseValue(value));
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const prevTextRef = useRef(segmentsToText(parseValue(value)));

  // 외부 value 변경 시 동기화 (편집 중이 아닐 때만)
  useEffect(() => {
    if (!isEditing) {
      const newSegs = parseValue(value);
      setSegments(newSegs);
      prevTextRef.current = segmentsToText(newSegs);
    }
  }, [value, isEditing]);

  // 색상 버튼 클릭
  const handleColorClick = useCallback((colorId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveColor(prev => prev === colorId ? null : colorId);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  // 형광펜 전체 제거
  const removeAllHighlights = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fullText = segmentsToText(segments);
    const newSegs: Segment[] = fullText ? [{ text: fullText, color: null }] : [];
    setSegments(newSegs);
    prevTextRef.current = fullText;
    onChange(JSON.stringify(newSegs));
    setActiveColor(null);
  }, [segments, onChange]);

  // textarea 입력 처리 - 핵심 로직
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const prevText = prevTextRef.current;

    if (newText === prevText) return;

    // 텍스트 변화 분석
    const prevLen = prevText.length;
    const newLen = newText.length;
    const diff = newLen - prevLen;

    let newSegments: Segment[];

    if (diff > 0) {
      // 텍스트 추가됨 - 어디에 추가됐는지 찾기
      // 앞에서 공통 부분 찾기
      let commonStart = 0;
      while (commonStart < prevLen && commonStart < newLen && prevText[commonStart] === newText[commonStart]) {
        commonStart++;
      }
      // 뒤에서 공통 부분 찾기
      let commonEnd = 0;
      while (
        commonEnd < prevLen - commonStart &&
        commonEnd < newLen - commonStart &&
        prevText[prevLen - 1 - commonEnd] === newText[newLen - 1 - commonEnd]
      ) {
        commonEnd++;
      }

      const addedText = newText.slice(commonStart, newLen - commonEnd);
      const insertPos = commonStart;

      // 현재 세그먼트에서 insertPos 위치 찾기
      newSegments = insertIntoSegments(segments, insertPos, addedText, activeColor);
    } else if (diff < 0) {
      // 텍스트 삭제됨
      let commonStart = 0;
      while (commonStart < newLen && commonStart < prevLen && newText[commonStart] === prevText[commonStart]) {
        commonStart++;
      }
      let commonEnd = 0;
      while (
        commonEnd < prevLen - commonStart &&
        commonEnd < newLen - commonStart &&
        prevText[prevLen - 1 - commonEnd] === newText[newLen - 1 - commonEnd]
      ) {
        commonEnd++;
      }

      const deleteStart = commonStart;
      const deleteEnd = prevLen - commonEnd;

      newSegments = deleteFromSegments(segments, deleteStart, deleteEnd);
    } else {
      // 같은 길이지만 내용이 다름 (교체)
      let commonStart = 0;
      while (commonStart < newLen && prevText[commonStart] === newText[commonStart]) commonStart++;
      let commonEnd = 0;
      while (commonEnd < newLen - commonStart && prevText[prevLen - 1 - commonEnd] === newText[newLen - 1 - commonEnd]) commonEnd++;

      const deleteStart = commonStart;
      const deleteEnd = prevLen - commonEnd;
      const addedText = newText.slice(commonStart, newLen - commonEnd);

      const afterDelete = deleteFromSegments(segments, deleteStart, deleteEnd);
      newSegments = insertIntoSegments(afterDelete, commonStart, addedText, activeColor);
    }

    // 빈 세그먼트 제거 및 같은 색상 인접 세그먼트 병합
    newSegments = mergeSegments(newSegments.filter(s => s.text.length > 0));

    prevTextRef.current = newText;
    setSegments(newSegments);
    onChange(JSON.stringify(newSegments));
  }, [segments, activeColor, onChange]);

  const handleFocus = useCallback(() => setIsEditing(true), []);
  const handleBlur = useCallback(() => setIsEditing(false), []);

  const fullText = segmentsToText(segments);
  const hasContent = fullText.length > 0;
  const hasHighlight = segments.some(s => s.color !== null);

  return (
    <div className="relative w-full">
      {/* 형광펜 색상 선택 툴바 */}
      <div className="flex items-center gap-1 mb-1 flex-wrap">
        <span style={{ color: `${textColor}70`, fontSize: '10px' }}>형광펜:</span>
        {HIGHLIGHT_COLORS.map(c => (
          <button
            key={c.id}
            type="button"
            onMouseDown={e => handleColorClick(c.id, e)}
            className="w-5 h-5 rounded-full flex-shrink-0 transition-all"
            style={{
              background: c.bg,
              border: activeColor === c.id ? '2.5px solid #333' : '1.5px solid #bbb',
              transform: activeColor === c.id ? 'scale(1.3)' : 'scale(1)',
            }}
            title={c.label}
          />
        ))}
        {activeColor && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setActiveColor(null); setTimeout(() => textareaRef.current?.focus(), 0); }}
            style={{ fontSize: '10px', padding: '1px 5px', background: '#eee', border: '1px solid #ccc', borderRadius: '3px', color: '#555' }}
          >
            끄기
          </button>
        )}
        {hasHighlight && (
          <button
            type="button"
            onMouseDown={removeAllHighlights}
            style={{ fontSize: '10px', padding: '1px 5px', background: '#eee', border: '1px solid #ccc', borderRadius: '3px', color: '#888' }}
            title="형광펜 모두 지우기"
          >
            ✕
          </button>
        )}
      </div>

      {/* 렌더링 표시 영역 (클릭하면 textarea 포커스) */}
      <div
        onClick={() => textareaRef.current?.focus()}
        className="w-full min-h-[28px] text-xs leading-relaxed cursor-text relative"
        style={{
          borderBottom: `1px solid ${borderColor}`,
          paddingBottom: '2px',
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
        }}
      >
        {hasContent ? (
          segments.map((seg, i) =>
            seg.color ? (
              <span
                key={i}
                style={{
                  background: HIGHLIGHT_COLORS.find(c => c.id === seg.color)?.bg ?? seg.color,
                  borderRadius: '2px',
                  padding: '0 1px',
                  color: textColor,
                }}
              >
                {seg.text}
              </span>
            ) : (
              <span key={i} style={{ color: textColor }}>{seg.text}</span>
            )
          )
        ) : (
          <span style={{ color: `${textColor}50` }}>{placeholder}</span>
        )}
        {/* 투명 textarea - 실제 입력 받는 영역 */}
        <textarea
          ref={textareaRef}
          value={fullText}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          rows={1}
          className="absolute inset-0 w-full h-full opacity-0 resize-none outline-none cursor-text"
          style={{
            fontSize: '12px',
            lineHeight: '1.625',
            background: 'transparent',
            color: 'transparent',
            caretColor: textColor,
            padding: '0',
            border: 'none',
          }}
          aria-label={placeholder}
        />
      </div>
    </div>
  );
}

// 세그먼트 배열의 특정 위치에 텍스트 삽입
function insertIntoSegments(segments: Segment[], pos: number, text: string, color: string | null): Segment[] {
  if (!text) return segments;
  if (segments.length === 0) return [{ text, color }];

  const result: Segment[] = [];
  let offset = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segEnd = offset + seg.text.length;

    if (pos <= offset) {
      // 이 세그먼트 앞에 삽입
      if (result.length > 0 && result[result.length - 1].color === color) {
        result[result.length - 1] = { ...result[result.length - 1], text: result[result.length - 1].text + text };
      } else {
        result.push({ text, color });
      }
      result.push(seg);
    } else if (pos >= segEnd) {
      // 이 세그먼트 뒤에 삽입 (마지막 세그먼트인 경우)
      result.push(seg);
      if (i === segments.length - 1) {
        if (seg.color === color) {
          result[result.length - 1] = { ...result[result.length - 1], text: result[result.length - 1].text + text };
        } else {
          result.push({ text, color });
        }
      }
    } else {
      // 이 세그먼트 중간에 삽입
      const before = seg.text.slice(0, pos - offset);
      const after = seg.text.slice(pos - offset);

      if (before) result.push({ text: before, color: seg.color });

      if (result.length > 0 && result[result.length - 1].color === color) {
        result[result.length - 1] = { ...result[result.length - 1], text: result[result.length - 1].text + text };
      } else {
        result.push({ text, color });
      }

      if (after) result.push({ text: after, color: seg.color });
    }

    offset = segEnd;
  }

  return result;
}

// 세그먼트 배열에서 [start, end) 범위 텍스트 삭제
function deleteFromSegments(segments: Segment[], start: number, end: number): Segment[] {
  if (start >= end) return segments;

  const result: Segment[] = [];
  let offset = 0;

  for (const seg of segments) {
    const segStart = offset;
    const segEnd = offset + seg.text.length;

    if (segEnd <= start || segStart >= end) {
      // 삭제 범위 밖 - 그대로 유지
      result.push(seg);
    } else {
      // 삭제 범위와 겹침
      const keepBefore = seg.text.slice(0, Math.max(0, start - segStart));
      const keepAfter = seg.text.slice(Math.min(seg.text.length, end - segStart));

      if (keepBefore) result.push({ text: keepBefore, color: seg.color });
      if (keepAfter) result.push({ text: keepAfter, color: seg.color });
    }

    offset = segEnd;
  }

  return result;
}

// 인접한 같은 색상 세그먼트 병합
function mergeSegments(segments: Segment[]): Segment[] {
  if (segments.length === 0) return [];
  const result: Segment[] = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const last = result[result.length - 1];
    const cur = segments[i];
    if (last.color === cur.color) {
      result[result.length - 1] = { text: last.text + cur.text, color: last.color };
    } else {
      result.push(cur);
    }
  }
  return result;
}
