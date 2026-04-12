/**
 * MemoEditor - 순수 textarea 기반 메모 컴포넌트
 *
 * 설계:
 * - 입력: 완전한 표준 textarea (세그먼트/diff 로직 없음, 한국어 IME 완전 호환)
 * - 형광펜: 편집 모드에서는 일반 텍스트만 표시, 저장 후 표시 모드에서 색상 적용
 * - 저장값: { text: string, highlights: { start: number, end: number, color: string }[] }
 *
 * 사용법:
 * 1. 텍스트 입력 (일반 textarea)
 * 2. 색상 버튼 선택
 * 3. 텍스트 드래그 선택 → 자동으로 형광펜 적용
 * 4. 저장 후 표시 모드에서 형광펜 확인
 */

import { useRef, useState, useEffect, useCallback } from 'react';

const COLORS = [
  { id: 'yellow', label: '노랑', bg: '#FFE066' },
  { id: 'green',  label: '초록', bg: '#B8F5B0' },
  { id: 'pink',   label: '분홍', bg: '#FFB3D1' },
  { id: 'blue',   label: '파랑', bg: '#A8D8FF' },
];

type Highlight = { start: number; end: number; color: string };

type MemoData = {
  text: string;
  highlights: Highlight[];
};

type Props = {
  value: string; // JSON MemoData 또는 순수 텍스트
  onChange: (value: string) => void;
  placeholder?: string;
  textColor?: string;
  borderColor?: string;
};

function parseValue(value: string): MemoData {
  if (!value) return { text: '', highlights: [] };
  try {
    const p = JSON.parse(value);
    if (p && typeof p.text === 'string' && Array.isArray(p.highlights)) {
      return p as MemoData;
    }
  } catch {}
  // 구형 세그먼트 JSON 또는 HTML 또는 순수 텍스트
  let text = value;
  try {
    const p = JSON.parse(value);
    if (Array.isArray(p)) {
      // 구형 세그먼트 배열
      text = p.map((s: any) => s.text ?? '').join('');
    }
  } catch {}
  // HTML 태그 제거
  text = text
    .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return { text, highlights: [] };
}

function serialize(data: MemoData): string {
  return JSON.stringify(data);
}

// 텍스트에 하이라이트 적용해서 span 배열로 렌더링
function renderHighlighted(text: string, highlights: Highlight[], textColor: string) {
  if (!text) return null;
  if (!highlights.length) return <span style={{ color: textColor }}>{text}</span>;

  // 겹치지 않도록 정렬 및 병합
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const merged: Highlight[] = [];
  for (const h of sorted) {
    if (!merged.length || h.start >= merged[merged.length - 1].end) {
      merged.push({ ...h });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, h.end);
    }
  }

  const spans: React.ReactNode[] = [];
  let pos = 0;
  for (const h of merged) {
    const s = Math.max(0, Math.min(h.start, text.length));
    const e = Math.max(0, Math.min(h.end, text.length));
    if (s > pos) spans.push(<span key={`t${pos}`} style={{ color: textColor }}>{text.slice(pos, s)}</span>);
    if (e > s) {
      const bg = COLORS.find(c => c.id === h.color)?.bg ?? '#FFE066';
      spans.push(<span key={`h${s}`} style={{ background: bg, borderRadius: '2px', padding: '0 1px', color: textColor }}>{text.slice(s, e)}</span>);
    }
    pos = e;
  }
  if (pos < text.length) spans.push(<span key={`t${pos}`} style={{ color: textColor }}>{text.slice(pos)}</span>);
  return <>{spans}</>;
}

export function MemoEditor({ value, onChange, placeholder = '주문 메모', textColor = '#1a1a1a', borderColor = '#d0c8b0' }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [data, setData] = useState<MemoData>(() => parseValue(value));
  const [isEditing, setIsEditing] = useState(false);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const isFocusedRef = useRef(false);

  // 외부 value 변경 동기화 (편집 중 아닐 때만)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setData(parseValue(value));
    }
  }, [value]);

  // textarea 변경 - 순수하게 텍스트만 업데이트
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setData(prev => {
      // 텍스트 길이 변화에 따라 하이라이트 위치 조정
      const oldText = prev.text;
      const oldLen = oldText.length;
      const newLen = newText.length;

      let adjustedHighlights = prev.highlights;

      if (oldLen !== newLen) {
        // 앞에서 공통 부분 찾기
        let cs = 0;
        while (cs < Math.min(oldLen, newLen) && oldText[cs] === newText[cs]) cs++;

        const diff = newLen - oldLen;

        // 변경 지점 이후 하이라이트 위치 조정
        adjustedHighlights = prev.highlights
          .map(h => {
            if (h.start >= cs) {
              return { ...h, start: Math.max(cs, h.start + diff), end: Math.max(cs, h.end + diff) };
            } else if (h.end > cs) {
              return { ...h, end: Math.max(cs, h.end + diff) };
            }
            return h;
          })
          .filter(h => h.start < h.end && h.end <= newLen);
      }

      const newData = { text: newText, highlights: adjustedHighlights };
      onChange(serialize(newData));
      return newData;
    });
  }, [onChange]);

  // 텍스트 선택 후 형광펜 적용
  const handleSelect = useCallback(() => {
    if (!activeColor || !taRef.current) return;
    const ta = taRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return; // 선택 없음

    setData(prev => {
      // 기존 하이라이트와 겹치는 부분 제거 후 새 하이라이트 추가
      const filtered = prev.highlights.filter(h => h.end <= start || h.start >= end);
      const newHighlights = [...filtered, { start, end, color: activeColor }];
      const newData = { ...prev, highlights: newHighlights };
      onChange(serialize(newData));
      return newData;
    });
  }, [activeColor, onChange]);

  // 형광펜 전체 제거
  const removeAll = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setData(prev => {
      const newData = { ...prev, highlights: [] };
      onChange(serialize(newData));
      return newData;
    });
    setActiveColor(null);
  }, [onChange]);

  const handleFocus = () => { isFocusedRef.current = true; setIsEditing(true); };
  const handleBlur = () => { isFocusedRef.current = false; setIsEditing(false); };

  const hasHighlight = data.highlights.length > 0;

  return (
    <div className="relative w-full">
      {/* 형광펜 툴바 */}
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span style={{ color: `${textColor}60`, fontSize: '10px' }}>형광펜:</span>
        {COLORS.map(c => (
          <button
            key={c.id}
            type="button"
            onMouseDown={e => { e.preventDefault(); setActiveColor(prev => prev === c.id ? null : c.id); setTimeout(() => taRef.current?.focus(), 0); }}
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
          <span style={{ fontSize: '9px', color: `${textColor}70` }}>텍스트 선택 시 적용</span>
        )}
        {hasHighlight && (
          <button
            type="button"
            onMouseDown={removeAll}
            style={{ fontSize: '10px', padding: '1px 5px', background: '#eee', border: '1px solid #ccc', borderRadius: '3px', color: '#888', marginLeft: '2px' }}
            title="형광펜 모두 지우기"
          >
            ✕
          </button>
        )}
      </div>

      {/* 입력 영역 */}
      <div style={{ borderBottom: `1px solid ${borderColor}`, paddingBottom: '2px' }}>
        {isEditing ? (
          // 편집 모드: 순수 textarea
          <textarea
            ref={taRef}
            value={data.text}
            onChange={handleChange}
            onSelect={handleSelect}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none outline-none text-xs leading-relaxed"
            style={{
              background: 'transparent',
              border: 'none',
              color: textColor,
              caretColor: textColor,
              padding: '0',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
              minHeight: '20px',
            }}
          />
        ) : (
          // 표시 모드: 형광펜 렌더링
          <div
            onClick={() => { setIsEditing(true); setTimeout(() => taRef.current?.focus(), 0); }}
            className="w-full min-h-[20px] text-xs leading-relaxed cursor-text"
            style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}
          >
            {data.text
              ? renderHighlighted(data.text, data.highlights, textColor)
              : <span style={{ color: `${textColor}45` }}>{placeholder}</span>
            }
          </div>
        )}
      </div>
    </div>
  );
}
