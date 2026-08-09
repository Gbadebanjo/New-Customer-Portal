import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import classes from './docsPage.module.css';

/**
 * Renders a Markdown file from /docs as a styled page.
 * Server-side — the file is read at request time so edits show up on refresh
 * without a rebuild. Public route (no auth) so API consumers can reach it.
 */
export default function DocsPage({ file, title }) {
    const abs = path.join(process.cwd(), 'docs', file);
    let html = '';
    let error = null;
    try {
        const raw = fs.readFileSync(abs, 'utf-8');
        html = marked.parse(raw, {
            gfm: true,       // GitHub-flavoured markdown (tables, autolinks)
            headerIds: true,
            mangle: false,
        });
    } catch (err) {
        error = err.message;
    }

    return (
        <div className={classes.wrapper}>
            <header className={classes.header}>
                <a href="/" className={classes.brand}>Daystar Power</a>
                <span className={classes.title}>{title}</span>
            </header>

            {error ? (
                <div className={classes.error}>Documentation file not found. If you were sent here by a Daystar admin, please reply to your invitation email.</div>
            ) : (
                <article className={classes.article} dangerouslySetInnerHTML={{ __html: html }} />
            )}

            <footer className={classes.footer}>
                <span>Need help? <a href="mailto:idt-servicedesk@daystar-power.com">idt-servicedesk@daystar-power.com</a></span>
                <span>&copy; {new Date().getFullYear()} Daystar Power</span>
            </footer>
        </div>
    );
}
