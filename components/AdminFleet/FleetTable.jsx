'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FaSearch } from 'react-icons/fa';
import classes from './adminFleet.module.css';

// Windowed rendering — with 400+ rows the DOM cost of rendering everything
// tanks scroll performance. Only rows in the visible window (+ small buffer)
// stay mounted; the rest are represented by top/bottom spacer divs so the
// scrollbar reflects the true content height. Zero-dependency virtualisation
// so we don't add react-window just for one screen.
const ROW_HEIGHT = 44;   // must match the CSS row height
const OVERSCAN  = 8;     // rows above/below the viewport to keep mounted

export default function FleetTable({ sites }) {
    const [search, setSearch] = useState('');
    const [country, setCountry] = useState('');
    const [type, setType] = useState('');
    const [product, setProduct] = useState('');

    // Sorted lists for the dropdowns. Countries are (code, name) pairs so
    // the dropdown displays "Nigeria" while filtering by the ISO code
    // ("NG") the sites are actually tagged with.
    const { countries, types, products } = useMemo(() => {
        const countryMap = new Map(); // code → displayName
        const ts = new Set(), ps = new Set();
        for (const s of sites) {
            if (s.country && !countryMap.has(s.country)) {
                countryMap.set(s.country, s.countryName || s.country);
            }
            if (s.typeLabel) ts.add(s.typeLabel);
            if (s.product) ps.add(s.product);
        }
        return {
            countries: [...countryMap.entries()]
                .map(([code, name]) => ({ code, name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            types: [...ts].sort(),
            products: [...ps].sort(),
        };
    }, [sites]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return sites.filter((s) => {
            if (country && s.country !== country) return false;
            if (type && s.typeLabel !== type) return false;
            if (product && s.product !== product) return false;
            if (!term) return true;
            return (
                s.name.toLowerCase().includes(term) ||
                s.place.toLowerCase().includes(term) ||
                s.customer.toLowerCase().includes(term) ||
                s.engineer.toLowerCase().includes(term)
            );
        });
    }, [sites, search, country, type, product]);

    // Virtualisation state.
    const scrollRef = useRef(null);
    const [range, setRange] = useState({ start: 0, end: 30 });

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const compute = () => {
            const scrollTop = el.scrollTop;
            const viewportH = el.clientHeight;
            const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
            const end = Math.min(
                filtered.length,
                Math.ceil((scrollTop + viewportH) / ROW_HEIGHT) + OVERSCAN
            );
            setRange({ start, end });
        };

        compute();
        el.addEventListener('scroll', compute, { passive: true });
        const ro = new ResizeObserver(compute);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', compute);
            ro.disconnect();
        };
    }, [filtered.length]);

    // Reset scroll to top whenever filters change; otherwise the user can
    // end up scrolled past the end of the newly-filtered list.
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [search, country, type, product]);

    const visible = filtered.slice(range.start, range.end);
    const topPad = range.start * ROW_HEIGHT;
    const bottomPad = Math.max(0, (filtered.length - range.end) * ROW_HEIGHT);

    return (
        <>
            <div className={classes.filters}>
                <div className={classes.searchGroup}>
                    <FaSearch size={12} className={classes.searchIcon} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, place, customer, engineer…"
                        className={classes.searchInput}
                    />
                    {search && (
                        <button type="button" onClick={() => setSearch('')} className={classes.clearBtn} aria-label="Clear search">×</button>
                    )}
                </div>
                <select className={classes.select} value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">All countries</option>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
                <select className={classes.select} value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="">All types</option>
                    {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className={classes.select} value={product} onChange={(e) => setProduct(e.target.value)}>
                    <option value="">All products</option>
                    {products.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className={classes.resultCount}>
                    {filtered.length} of {sites.length} sites
                </div>
            </div>

            <div ref={scrollRef} className={classes.scroll}>
                <div className={classes.headerRow}>
                    <div className={`${classes.cell} ${classes.cellName}`}>Site</div>
                    <div className={classes.cell}>Country</div>
                    <div className={classes.cell}>Place</div>
                    <div className={classes.cell}>Type</div>
                    <div className={classes.cell}>Product</div>
                    <div className={classes.cell}>Customer</div>
                    <div className={classes.cell}>Engineer</div>
                    <div className={`${classes.cell} ${classes.cellRight}`}>Capacity</div>
                </div>

                {filtered.length === 0 ? (
                    <div className={classes.empty}>No sites match the current filters.</div>
                ) : (
                    <>
                        {topPad > 0 && <div style={{ height: topPad }} />}
                        {visible.map((s) => (
                            <Link href={`/Assets/Details/${s.id}`} key={s.id} className={classes.row}>
                                <div className={`${classes.cell} ${classes.cellName}`}>{s.name}</div>
                                <div className={classes.cell}>{s.countryName || s.country || '—'}</div>
                                <div className={classes.cell}>{s.place}</div>
                                <div className={classes.cell}>{s.typeLabel}</div>
                                <div className={classes.cell}>{s.product || '—'}</div>
                                <div className={classes.cell}>{s.customer || '—'}</div>
                                <div className={classes.cell}>{s.engineer || '—'}</div>
                                <div className={`${classes.cell} ${classes.cellRight}`}>
                                    {s.capacityKw != null ? `${s.capacityKw.toLocaleString()} kW` : '—'}
                                </div>
                            </Link>
                        ))}
                        {bottomPad > 0 && <div style={{ height: bottomPad }} />}
                    </>
                )}
            </div>
        </>
    );
}
