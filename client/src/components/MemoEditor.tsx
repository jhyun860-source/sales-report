/**
 * MemoEditor - 형광펜 기능이 있는 메모 입력 컴포넌트
 * - 텍스트를 드래그 선택 후 형광펜 버튼 클릭으로 색상 적용
 * - 노란/초록/분홍/파란 4가지 형광펜 색상
 * - HTML 마크업으로 저장 (mark 태그 사용)
 *
 * 버그 수정:
 * 1. 플레이스홀더 겹침: CSS ::before 방식으로 변경 (absolute 위치 계산 불필요)
 * 2. 형광펜 클릭 시 selection 유실: savedRange ref에 저장해두고 복원
 * 3. 형광펜 미적용: onMouseDown e.preventDefault()로 blur 방지 + savedRange 복원
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Highlighter } from 'lucide-react';

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: '노랑', bg: '#FFE066', text: '#333' },
  { id: 'green',  label: '초록', bg: '#B8F5B0', text: '#333' },
  { id: 'pink',   label: '분홍', bg: '#FFB3D1', text: '#333' },
  { id: 'blue',   label: '파랑', bg: '#A8D8FF', text: '#333' },
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
  const [showPicker, setShowPicker] = useState(false);
  const isComposing = useRef(false);
  const lastValue = useRef(value);
  // 형광펜 버튼 클릭 전 selection을 저장해두는 ref
  const savedRange = useRef<Range | null>(null);

  // 외부 value가 바뀔 때만 innerHTML 동기화 (커서 보호)
  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value && lastValue.current !== value) {
      editorRef.current.innerHTML = value || '';
      lastValue.current = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current || isComposing.current) return;
    const html = editorRef.current.innerHTML;
    // <br>만 있는 빈 상태는 빈 문자열로 정규화
    const normalized = html === '<br>' ? '' : html;
    lastValue.current = normalized;
    onChange(normalized);
  }, [onChange]);

  const handleCompositionStart = () => { isComposing.current = true; };
  const handleCompositionEnd = () => {
    isComposing.current = false;
    handleInput();
  };

  // 에디터에서 포커스가 나가기 직전 selection을 저장
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // 에디터 내부 선택인지 확인
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
        return;
      }
    }
    // 에디터 외부면 저장하지 않음
  }, []);

  // 저장된 selection 복원
  const restoreSelection = useCallback(() => {
    if (!savedRange.current) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
    return true;
  }, []);

  // 형광펜 적용
  const applyHighlight = useCallback((colorId: string) => {
    const color = HIGHLIGHT_COLORS.find(c => c.id === colorId);
    if (!color) return;

    // 저장된 selection 복원 시도
    restoreSelection();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setShowPicker(false);
      return;
    }

    const range = sel.getRangeAt(0);

    // 에디터 내부 선택인지 확인
    if (!editorRef.current?.contains(range.commonAncestorContainer)) {
      setShowPicker(false);
      return;
    }

    // mark 태그로 감싸기
    const mark = document.createElement('mark');
    mark.style.backgroundColor = color.bg;
    mark.style.color = color.text;
    mark.style.borderRadius = '2px';
    mark.style.padding = '0 1px';

    try {
      range.surroundContents(mark);
    } catch {
      // 부분 선택이 여러 노드에 걸친 경우 extractContents 사용
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }

    sel.removeAllRanges();
    savedRange.current = null;
    setShowPicker(false);

    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValue.current = html;
      onChange(html);
    }
  }, [onChange, restoreSelection]);

  // 형광펜 제거 (mark 태그 unwrap)
  const removeHighlight = useCallback(() => {
    // 저장된 selection 복원 시도
    restoreSelection();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setShowPicker(false);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) {
      setShowPicker(false);
      return;
    }

    // 선택 범위 내 mark 태그 모두 unwrap
    const marks = Array.from(editorRef.current.querySelectorAll('mark'));
    marks.forEach(mark => {
      if (sel.containsNode(mark, true)) {
        const parent = mark.parentNode;
        if (parent) {
          while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
          parent.removeChild(mark);
        }
      }
    });

    sel.removeAllRanges();
    savedRange.current = null;
    setShowPicker(false);

    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValue.current = html;
      onChange(html);
    }
  }, [onChange, restoreSelection]);

  const isEmpty = !value || value === '' || value === '<br>';

  return (
    <div className="relative w-full">
      {/* 툴바 */}
      <div className="flex items-center gap-1 mb-1">
        <button
          type="button"
          onMouseDown={e => {
            // blur 방지 + selection 저장
            e.preventDefault();
            saveSelection();
            setShowPicker(p => !p);
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors"
          style={{
            background: showPicker ? '#FFE066' : 'transparent',
            border: `1px solid ${borderColor}`,
            color: textColor,
          }}
          title="형광펜"
        >
          <Highlighter size={11} />
          <span>형광펜</span>
        </button>

        {/* 색상 선택 팝업 */}
        {showPicker && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg shadow-md z-10"
            style={{ background: '#fff', border: `1px solid ${borderColor}` }}
          >
            {HIGHLIGHT_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  applyHighlight(c.id);
                }}
                className="w-5 h-5 rounded-full border-2 transition-transform active:scale-95"
                style={{
                  background: c.bg,
                  borderColor: '#55555544',
                }}
                title={c.label}
              />
            ))}
            {/* 지우기 버튼 */}
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                removeHighlight();
              }}
              className="ml-1 px-1.5 py-0.5 rounded text-xs"
              style={{ background: '#f0f0f0', color: '#555', border: '1px solid #ccc' }}
              title="형광펜 제거"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 에디터 영역 - 플레이스홀더는 CSS로 처리 */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onBlur={handleInput}
        className="memo-editor w-full min-h-[28px] outline-none text-xs leading-relaxed"
        style={{
          color: textColor,
          borderBottom: `1px solid ${borderColor}`,
          paddingBottom: '2px',
          wordBreak: 'break-all',
          // CSS 변수로 플레이스홀더 색상 전달
          ['--placeholder-color' as string]: `${textColor}70`,
          ['--placeholder-text' as string]: `"${placeholder}"`,
        }}
        data-placeholder={isEmpty ? placeholder : ''}
      />
    </div>
  );
}
