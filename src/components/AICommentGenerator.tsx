'use client';

import { useState, useRef } from 'react';
import { useCompletion } from 'ai/react';

interface AICommentGeneratorProps {
    studentName: string;
    subject: string;
    marks: number;
    outOf: number;
    grade: string;
    term?: string;
    className?: string;
    onInsert?: (english: string, swahili: string) => void;
}

export default function AICommentGenerator({
    studentName, subject, marks, outOf, grade, term, className, onInsert,
}: AICommentGeneratorProps) {
    const [showPanel, setShowPanel] = useState(false);
    const [english, setEnglish] = useState('');
    const [swahili, setSwahili] = useState('');
    const [copied, setCopied] = useState<'en' | 'sw' | null>(null);

    const { complete, completion, isLoading, error } = useCompletion({
        api: '/api/ai/report-comments',
        onFinish: (_, fullText) => {
            // Parse English and Kiswahili from streamed text
            const enMatch = fullText.match(/ENGLISH:\s*(.+?)(?=KISWAHILI:|$)/s);
            const swMatch = fullText.match(/KISWAHILI:\s*(.+?)$/s);
            setEnglish(enMatch?.[1]?.trim() || '');
            setSwahili(swMatch?.[1]?.trim() || '');
        },
    });

    const handleGenerate = async () => {
        setEnglish('');
        setSwahili('');
        await complete('generate', {
            body: { studentName, subject, marks, outOf, grade, term, className },
        });
    };

    const handleCopy = (text: string, type: 'en' | 'sw') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const pct = outOf > 0 ? Math.round((marks / outOf) * 100) : marks;
    const gradeColor = pct >= 75 ? '#059669' : pct >= 50 ? '#d97706' : '#ef4444';

    if (!showPanel) {
        return (
            <button
                onClick={() => setShowPanel(true)}
                className="ai-comment-btn"
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                    color: '#fff', fontSize: '12px', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                    transition: 'all 0.2s ease',
                }}
            >
                <span style={{ fontSize: '14px' }}>🤖</span>
                AI Comment
            </button>
        );
    }

    return (
        <div style={{
            border: '1px solid #e9d5ff', borderRadius: '16px',
            background: 'linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%)',
            padding: '16px', marginTop: '8px',
            boxShadow: '0 4px 20px rgba(124,58,237,0.1)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '10px',
                        background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                    }}>🤖</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#4c1d95' }}>AI Comment Generator</div>
                        <div style={{ fontSize: '11px', color: '#7c3aed' }}>English + Kiswahili · GPT-4o</div>
                    </div>
                </div>
                <button onClick={() => setShowPanel(false)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', fontSize: '18px', lineHeight: 1,
                }}>×</button>
            </div>

            {/* Student info pill */}
            <div style={{
                display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px',
            }}>
                {[
                    { label: studentName, bg: '#dbeafe', color: '#1e40af' },
                    { label: subject, bg: '#f3e8ff', color: '#6d28d9' },
                    { label: `${marks}/${outOf} (${pct}%)`, bg: '#ecfdf5', color: gradeColor },
                    { label: grade, bg: '#fef3c7', color: '#92400e' },
                ].map((pill, i) => (
                    <span key={i} style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                        fontWeight: 700, backgroundColor: pill.bg, color: pill.color,
                    }}>{pill.label}</span>
                ))}
            </div>

            {/* Generate button */}
            <button
                onClick={handleGenerate}
                disabled={isLoading}
                style={{
                    width: '100%', padding: '10px', borderRadius: '12px', border: 'none',
                    background: isLoading ? '#e9d5ff' : 'linear-gradient(135deg, #7c3aed, #2563eb)',
                    color: isLoading ? '#7c3aed' : '#fff', fontWeight: 800, fontSize: '13px',
                    cursor: isLoading ? 'not-allowed' : 'pointer', marginBottom: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s ease',
                }}
            >
                {isLoading ? (
                    <>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
                        Generating...
                    </>
                ) : (
                    <>{english ? '🔄 Regenerate' : '✨ Generate Comment'}</>
                )}
            </button>

            {/* Live streaming output */}
            {isLoading && completion && (
                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '12px',
                    padding: '12px', fontSize: '13px', color: '#374151',
                    lineHeight: '1.6', marginBottom: '10px', minHeight: '60px',
                    border: '1px solid #e9d5ff', whiteSpace: 'pre-wrap',
                }}>
                    {completion}<span style={{ animation: 'blink 1s step-end infinite' }}>▌</span>
                </div>
            )}

            {/* Final results */}
            {!isLoading && english && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* English */}
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '12px', padding: '12px',
                        border: '1px solid #bfdbfe',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>🇬🇧 English</span>
                            <button onClick={() => handleCopy(english, 'en')} style={{
                                border: 'none', background: '#dbeafe', color: '#1d4ed8',
                                padding: '3px 10px', borderRadius: '8px', fontSize: '11px',
                                fontWeight: 700, cursor: 'pointer',
                            }}>
                                {copied === 'en' ? '✅ Copied!' : '📋 Copy'}
                            </button>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{english}</p>
                    </div>

                    {/* Kiswahili */}
                    {swahili && (
                        <div style={{
                            backgroundColor: '#fff', borderRadius: '12px', padding: '12px',
                            border: '1px solid #bbf7d0',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>🇰🇪 Kiswahili</span>
                                <button onClick={() => handleCopy(swahili, 'sw')} style={{
                                    border: 'none', background: '#d1fae5', color: '#065f46',
                                    padding: '3px 10px', borderRadius: '8px', fontSize: '11px',
                                    fontWeight: 700, cursor: 'pointer',
                                }}>
                                    {copied === 'sw' ? '✅ Copied!' : '📋 Copy'}
                                </button>
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{swahili}</p>
                        </div>
                    )}

                    {/* Insert button */}
                    {onInsert && (
                        <button
                            onClick={() => { onInsert(english, swahili); setShowPanel(false); }}
                            style={{
                                padding: '10px', borderRadius: '12px', border: 'none',
                                background: 'linear-gradient(135deg, #059669, #0d9488)',
                                color: '#fff', fontWeight: 800, fontSize: '13px',
                                cursor: 'pointer', width: '100%',
                            }}
                        >
                            ✅ Use This Comment
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div style={{
                    backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
                    borderRadius: '10px', padding: '10px', fontSize: '12px', color: '#991b1b',
                }}>
                    ⚠️ {error.message || 'Failed to generate. Check your OpenAI API key.'}
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes blink { 50% { opacity: 0; } }
            `}</style>
        </div>
    );
}
