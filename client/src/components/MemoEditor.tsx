/**
 * MemoEditor - 형광펜 기능이 있는 메모 입력 컴포넌트
 *
 * 구조:
 * - textarea: 실제 텍스트 입력 (표준 placeholder, 안정적 입력)
 * - 형광펜 모드: 텍스트 선택 후 색상 버튼 클릭 → 선택 범위에 <mark> 태그 삽입
 * - 저장값: 순수 텍스트 or HTML (mark 태그 포함)
 * - 표시: dangerouslySetInnerHTML로 형광펜 렌더링
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Highlighter, Pencil } from 'lucide-react';

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

// HTML에서 순수 텍스트 추출
function htmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<mark[^>]*>/gi, '')
    .replace(/<\/mark>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

// 텍스트에서 특정 범위에 mark 태그 삽입
function applyMarkToText(text: string, start: number, end: number, bg: string): string {
  if (start >= end) return text;
  const before = escapeHtml(text.slice(0, start));
  const selected = escapeHtml(text.slice(start, end));
  const after = escapeHtml(text.slice(end));
  return before + `<mark style="background:${bg};border-radius:2px;padding:0 1px;">${selected}</mark>` + after;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

export function MemoEditor({
  value,
  onChange,
  placeholder = '주문 메모',
  textColor = '#1a1a1a',
  borderColor = '#d0c8b0',
}: Props) {
  // 현재 편집 모드 여부
  const [isEditing, setIsEditing] = useState(false);
  // textarea에 표시할 순수 텍스트
  const [text, setText] = useState(() => htmlToText(value));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 형광펜 팔레트 표시 여부
  const [showPicker, setShowPicker] = useState(false);
  // 형광펜 적용을 위해 저장한 선택 범위
  const savedSelection = useRef<{ start: number; end: number } | null>(null);

  // 외부 value가 바뀌면 text 동기화 (편집 중이 아닐 때만)
  useEffect(() => {
    if (!isEditing) {
      setText(htmlToText(value));
    }
  }, [value, isEditing]);

  // 편집 시작: textarea 포커스
  const startEditing = useCallback(() => {
    setIsEditing(true);
    setShowPicker(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, []);

  // 편집 완료: 텍스트를 HTML로 변환해 저장
  const finishEditing = useCallback(() => {
    setIsEditing(false);
    setShowPicker(false);
    savedSelection.current = null;
    const html = escapeHtml(text);
    onChange(html);
  }, [text, onChange]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  // 형광펜 버튼 클릭: 현재 textarea selection 저장
  const handleHighlightButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isEditing) {
      // 편집 모드가 아니면 먼저 편집 모드로
      startEditing();
      setShowPicker(true);
      return;
    }

    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      if (start !== end) {
        savedSelection.current = { start, end };
      }
    }
    setShowPicker(p => !p);
  }, [isEditing, startEditing]);

  // 색상 선택: 저장된 selection에 mark 적용
  const applyHighlight = useCallback((colorId: string) => {
    const color = HIGHLIGHT_COLORS.find(c => c.id === colorId);
    if (!color) return;

    const sel = savedSelection.current;
    if (!sel || sel.start >= sel.end) {
      setShowPicker(false);
      return;
    }

    // 현재 텍스트에 mark 적용 → HTML로 변환
    const markedHtml = applyMarkToText(text, sel.start, sel.end, color.bg);
    savedSelection.current = null;
    setShowPicker(false);
    setIsEditing(false);
    onChange(markedHtml);
    // text도 업데이트 (mark 제거된 순수 텍스트)
    setText(htmlToText(markedHtml));
  }, [text, onChange]);

  // 형광펜 전체 제거
  const removeAllHighlights = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const plain = htmlToText(value);
    onChange(plain);
    setText(plain);
    setShowPicker(false);
    savedSelection.current = null;
  }, [value, onChange]);

  const hasContent = text.trim().length > 0;
  const hasHighlight = value.includes('<mark');

  return (
    <div className="relative w-full">
      {/* 툴바 */}
      <div className="flex items-center gap-1 mb-1">
        {/* 형광펜 버튼 */}
        <button
          type="button"
          onMouseDown={handleHighlightButtonClick}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
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

        {/* 편집 버튼 (형광펜 있을 때) */}
        {hasHighlight && !isEditing && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); startEditing(); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{
              background: 'transparent',
              border: `1px solid ${borderColor}`,
              color: textColor,
            }}
            title="편집"
          >
            <Pencil size={11} />
            <span>편집</span>
          </button>
        )}

        {/* 형광펜 제거 버튼 */}
        {hasHighlight && (
          <button
            type="button"
            onMouseDown={removeAllHighlights}
            className="px-1.5 py-0.5 rounded text-xs"
            style={{ background: '#f0f0f0', color: '#555', border: '1px solid #ccc' }}
            title="형광펜 모두 제거"
          >
            ✕
          </button>
        )}

        {/* 색상 팔레트 */}
        {showPicker && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg shadow-md"
            style={{ background: '#fff', border: `1px solid ${borderColor}` }}
          >
            <span className="text-xs mr-1" style={{ color: '#888' }}>색상:</span>
            {HIGHLIGHT_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); applyHighlight(c.id); }}
                className="w-5 h-5 rounded-full border"
                style={{ background: c.bg, borderColor: '#aaa' }}
                title={c.label}
              />
            ))}
          </div>
        )}
      </div>

      {/* 편집 모드: textarea */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onBlur={finishEditing}
          placeholder={placeholder}
          rows={2}
          className="w-full outline-none text-xs leading-relaxed resize-none bg-transparent"
          style={{
            color: textColor,
            borderBottom: `1px solid ${borderColor}`,
            paddingBottom: '2px',
            wordBreak: 'break-all',
          }}
        />
      ) : (
        /* 표시 모드: HTML 렌더링 (형광펜 포함) */
        <div
          onClick={startEditing}
          className="w-full min-h-[28px] text-xs leading-relaxed cursor-text"
          style={{
            color: hasContent ? textColor : `${textColor}60`,
            borderBottom: `1px solid ${borderColor}`,
            paddingBottom: '2px',
            wordBreak: 'break-all',
          }}
        >
          {hasContent ? (
            <span dangerouslySetInnerHTML={{ __html: value || '' }} />
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
      )}
    </div>
  );
}
