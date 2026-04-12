/**
 * MemoEditor - 형광펜 메모 컴포넌트
 *
 * 설계:
 * - 항상 contentEditable div 하나만 사용 (편집/표시 모드 분리 없음)
 * - 형광펜: 색상 선택 후 텍스트 드래그 → 즉시 적용
 * - 저장값: HTML 문자열 (mark 태그 포함)
 * - 한국어 IME 호환: compositionstart/end 이벤트로 조합 중 처리
 */

import { useRef, useState, useEffect, useCallback } from 'react';

const COLORS = [
  { id: 'yellow', label: '노랑', bg: '#FFE066' },
  { id: 'green',  label: '초록', bg: '#B8F5B0' },
  { id: 'pink',   label: '분홍', bg: '#FFB3D1' },
  { id: 'blue',   label: '파랑', bg: '#A8D8FF' },
];

type Props = {
  value: string; // HTML 또는 순수 텍스트
  onChange: (value: string) => void;
  placeholder?: string;
  textColor?: string;
  borderColor?: string;
};

// 구형 JSON 형식을 HTML로 변환
function normalizeToHtml(value: string): string {
  if (!value) return '';
  // 새 형식: JSON { text, highlights }
  try {
    const p = JSON.parse(value);
    if (p && typeof p.text === 'string' && Array.isArray(p.highlights)) {
      let text = p.text;
      // highlights를 HTML mark 태그로 변환
      const sorted = [...p.highlights].sort((a: any, b: any) => b.start - a.start);
      for (const h of sorted) {
        const bg = COLORS.find(c => c.id === h.color)?.bg ?? '#FFE066';
        const before = text.slice(0, h.start);
        const marked = text.slice(h.start, h.end);
        const after = text.slice(h.end);
        text = `${before}<mark style="background:${bg}">${marked}</mark>${after}`;
      }
      return text.replace(/\n/g, '<br>');
    }
    // 구형 세그먼트 배열
    if (Array.isArray(p)) {
      return p.map((s: any) => {
        const t = (s.text ?? '').replace(/\n/g, '<br>');
        if (s.color) {
          const bg = COLORS.find(c => c.id === s.color)?.bg ?? '#FFE066';
          return `<mark style="background:${bg}">${t}</mark>`;
        }
        return t;
      }).join('');
    }
  } catch {}
  // 이미 HTML이거나 순수 텍스트
  return value;
}

export function MemoEditor({ value, onChange, placeholder = '주문 메모', textColor = '#1a1a1a', borderColor = '#d0c8b0' }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const isComposingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const lastHtmlRef = useRef<string>('');

  // 초기값 및 외부 변경 동기화
  useEffect(() => {
    if (!divRef.current) return;
    if (isFocusedRef.current) return; // 편집 중엔 덮어쓰지 않음
    const html = normalizeToHtml(value);
    if (divRef.current.innerHTML !== html) {
      divRef.current.innerHTML = html;
      lastHtmlRef.current = html;
    }
  }, [value]);

  // 내용 변경 시 부모에 알림
  const handleInput = useCallback(() => {
    if (!divRef.current) return;
    if (isComposingRef.current) return; // 조합 중엔 저장 안 함
    const html = divRef.current.innerHTML;
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html;
      onChange(html);
    }
  }, [onChange]);

  // 형광펜 적용 - 색상 선택 후 텍스트 선택 시 즉시 적용
  const applyHighlight = useCallback((colorId: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return; // 선택 없음
    if (!divRef.current?.contains(range.commonAncestorContainer)) return;

    const bg = COLORS.find(c => c.id === colorId)?.bg ?? '#FFE066';
    const mark = document.createElement('mark');
    mark.style.background = bg;
    mark.style.borderRadius = '2px';
    mark.style.padding = '0 1px';

    try {
      range.surroundContents(mark);
    } catch {
      // surroundContents 실패 시 extractContents 사용
      const frag = range.extractContents();
      mark.appendChild(frag);
      range.insertNode(mark);
    }

    sel.removeAllRanges();

    if (divRef.current) {
      const html = divRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
    }
  }, [onChange]);

  // 색상 버튼 클릭 - 이미 선택된 텍스트가 있으면 즉시 적용
  const handleColorClick = useCallback((colorId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed;

    if (hasSelection) {
      // 선택된 텍스트가 있으면 즉시 적용
      applyHighlight(colorId);
      setActiveColor(colorId);
    } else {
      // 선택 없으면 색상만 활성화
      setActiveColor(prev => prev === colorId ? null : colorId);
      // 포커스 유지
      setTimeout(() => divRef.current?.focus(), 0);
    }
  }, [applyHighlight]);

  // mouseup 시 선택된 텍스트가 있고 색상이 활성화되어 있으면 형광펜 적용
  const handleMouseUp = useCallback(() => {
    if (!activeColor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    applyHighlight(activeColor);
  }, [activeColor, applyHighlight]);

  // 형광펜 전체 제거
  const removeAll = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!divRef.current) return;
    // mark 태그를 텍스트 노드로 교체
    const marks = divRef.current.querySelectorAll('mark');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
      }
    });
    const html = divRef.current.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
    setActiveColor(null);
  }, [onChange]);

  const hasHighlight = value && (value.includes('<mark') || value.includes('mark'));

  return (
    <div className="relative w-full">
      {/* 형광펜 툴바 */}
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span style={{ color: `${textColor}60`, fontSize: '10px' }}>형광펜:</span>
        {COLORS.map(c => (
          <button
            key={c.id}
            type="button"
            onMouseDown={(e) => handleColorClick(c.id, e)}
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

      {/* 편집 영역 - contentEditable div */}
      <div style={{ borderBottom: `1px solid ${borderColor}`, paddingBottom: '2px', position: 'relative' }}>
        <div
          ref={divRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onMouseUp={handleMouseUp}
          onFocus={() => { isFocusedRef.current = true; }}
          onBlur={() => {
            isFocusedRef.current = false;
            handleInput();
          }}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            handleInput();
          }}
          className="w-full min-h-[20px] text-xs leading-relaxed outline-none"
          style={{
            color: textColor,
            caretColor: textColor,
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
            cursor: 'text',
          }}
          data-placeholder={placeholder}
          lang="ko"
          inputMode="text"
        />
        {/* 플레이스홀더 */}
      </div>
    </div>
  );
}
