'use client';
import { PASSWORD_RULES, getPasswordStrength } from '@/utils/passwordValidation';

export default function PasswordStrengthIndicator({ password }) {
    const strength = getPasswordStrength(password);
    if (!strength) return null;

    const { score, label, color } = strength;
    const results = PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) }));

    return (
        <div style={{ marginTop: '10px' }}>
            {/* Strength bars */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '6px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '99px',
                            backgroundColor: i < score ? color : '#1e3a4d',
                            transition: 'background-color 0.25s ease',
                        }}
                    />
                ))}
            </div>

            {/* Strength label */}
            <p style={{ fontSize: '12px', fontWeight: 600, color, marginBottom: '8px', margin: '4px 0 8px' }}>
                {label}
            </p>

            {/* Requirements checklist */}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.map((rule) => (
                    <li
                        key={rule.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            fontSize: '12px',
                            color: rule.passed ? '#22c55e' : '#8fa0b3',
                            transition: 'color 0.2s ease',
                        }}
                    >
                        <span style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1, minWidth: '13px' }}>
                            {rule.passed ? '✓' : '○'}
                        </span>
                        {rule.label}
                    </li>
                ))}
            </ul>
        </div>
    );
}
