/**
 * MemoEditor - 형광펜 기능이 있는 메모 입력 컴포넌트
 *
 * 사용법:
 * 1. 색상 버튼을 먼저 선택 (노랑/초록/분홍/파랑)
 * 2. 이후 입력하는 글씨에 자동으로 형광펜 적용
 * 3. 색상 버튼 다시 클릭하면 형광펜 해제 (일반 텍스트)
 * 4. ✕ 버튼으로 전체 형광펜 제거
 *
 * 구현 방식: contentEditable div
 * - 색상 선택 상태에서 입력 시 document.execCommand('hiliteColor') 사용
 * - 저장값: innerHTML (mark 태그 포함 HTML)
 */

import { useRef, useState, useCallback, useEffect } from 'react';

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: '노랑', bg: '#FFE066' },
  { id: 'green',  label: '초록', bg: '#B8F5B0' },
  { id: 'pink',   label: '분홍', bg: '#FFB3D1' },
  { id: 'blue',   label: '파랑', bg: '#A8D8FF' },
];

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  textColor?: string;
  borderColor?: string;
};

export function MemoEditor({
  value,
  onChange,
  placeholder = '주문 메모',
  textColor = '#1a1a1a',
  borderColor = '#d0c8b0',
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  // 현재 선택된 형광펜 색상 (null = 일반 텍스트 모드)
  const [activeColor, setActiveColor] = useState<string | null>(null);
  // 외부에서 value가 바뀔 때 내부 DOM 업데이트 (편집 중이 아닐 때만)
  const isFocusedRef = useRef(false);
  const lastValueRef = useRef(value);

  // 초기 값 세팅
  useEffect(() => {
    if (editorRef.current && !isFocusedRef.current) {
      if (lastValueRef.current !== value) {
        editorRef.current.innerHTML = value || '';
        lastValueRef.current = value;
      }
    }
  }, [value]);

  // 색상 버튼 클릭: 선택/해제 토글
  const handleColorClick = useCallback((colorId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveColor(prev => prev === colorId ? null : colorId);
    // 에디터에 포커스 유지
    setTimeout(() => editorRef.current?.focus(), 0);
  }, []);

  // 형광펜 전체 제거
  const removeAllHighlights = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editorRef.current) return;
    const plain = editorRef.current.innerText || '';
    editorRef.current.innerHTML = plain;
    lastValueRef.current = plain;
    onChange(plain);
    setActiveColor(null);
  }, [onChange]);

  // 키 입력 처리: 색상 선택 상태에서 글자 입력 시 형광펜 자동 적용
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!activeColor) return;
    // 특수키(방향키, 백스페이스, 엔터 등)는 그냥 통과
    if (e.key.length !== 1) return;

    const color = HIGHLIGHT_COLORS.find(c => c.id === activeColor);
    if (!color) return;

    e.preventDefault();

    // 현재 커서 위치에 형광펜 적용된 글자 삽입
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    // 선택된 텍스트가 있으면 삭제
    if (!range.collapsed) {
      range.deleteContents();
    }

    // mark 태그로 감싼 텍스트 노드 삽입
    const mark = document.createElement('mark');
    mark.style.background = color.bg;
    mark.style.borderRadius = '2px';
    mark.style.padding = '0 1px';
    mark.textContent = e.key;

    range.insertNode(mark);

    // 커서를 mark 뒤로 이동
    range.setStartAfter(mark);
    range.setEndAfter(mark);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [activeColor]);

  // 붙여넣기 처리: 순수 텍스트로만 붙여넣기
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) range.deleteContents();

    if (activeColor) {
      const color = HIGHLIGHT_COLORS.find(c => c.id === activeColor);
      if (color) {
        const mark = document.createElement('mark');
        mark.style.background = color.bg;
        mark.style.borderRadius = '2px';
        mark.style.padding = '0 1px';
        mark.textContent = text;
        range.insertNode(mark);
        range.setStartAfter(mark);
        range.setEndAfter(mark);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
    }

    // 일반 텍스트 삽입
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [activeColor]);

  // 입력 완료 시 저장 (blur 또는 input 이벤트)
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  }, [onChange]);

  const hasHighlight = value.includes('<mark') || value.includes('background');

  return (
    <div className="relative w-full">
      {/* 형광펜 색상 선택 툴바 */}
      <div className="flex items-center gap-1 mb-1 flex-wrap">
        <span className="text-xs" style={{ color: `${textColor}80`, fontSize: '10px' }}>형광펜:</span>
        {HIGHLIGHT_COLORS.map(c => (
          <button
            key={c.id}
            type="button"
            onMouseDown={e => handleColorClick(c.id, e)}
            className="w-5 h-5 rounded-full border-2 transition-all flex-shrink-0"
            style={{
              background: c.bg,
              borderColor: activeColor === c.id ? '#333' : 'transparent',
              transform: activeColor === c.id ? 'scale(1.25)' : 'scale(1)',
              boxShadow: activeColor === c.id ? '0 0 0 1px #333' : 'none',
            }}
            title={`${c.label}${activeColor === c.id ? ' (선택됨 - 다시 클릭하면 해제)' : ''}`}
          />
        ))}
        {/* 형광펜 해제 버튼 */}
        {activeColor && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setActiveColor(null); setTimeout(() => editorRef.current?.focus(), 0); }}
            className="px-1.5 py-0 rounded text-xs ml-1"
            style={{ background: '#eee', color: '#555', border: '1px solid #ccc', lineHeight: '18px' }}
            title="형광펜 끄기"
          >
            끄기
          </button>
        )}
        {/* 전체 형광펜 제거 */}
        {hasHighlight && (
          <button
            type="button"
            onMouseDown={removeAllHighlights}
            className="px-1.5 py-0 rounded text-xs"
            style={{ background: '#eee', color: '#888', border: '1px solid #ccc', lineHeight: '18px' }}
            title="형광펜 모두 지우기"
          >
            ✕
          </button>
        )}
        {/* 현재 모드 표시 */}
        {activeColor && (
          <span className="text-xs ml-1" style={{ color: '#888', fontSize: '10px' }}>
            ✏️ 입력 중 자동 적용
          </span>
        )}
      </div>

      {/* contentEditable 에디터 */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-placeholder={placeholder}
        className="memo-editor-content w-full min-h-[28px] text-xs leading-relaxed outline-none"
        style={{
          color: textColor,
          borderBottom: `1px solid ${borderColor}`,
          paddingBottom: '2px',
          wordBreak: 'break-all',
          cursor: 'text',
          whiteSpace: 'pre-wrap',
        }}
      />
    </div>
  );
}
