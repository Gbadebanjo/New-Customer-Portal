function fmtNum(n, digits = 0) {
    if (n == null || isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n);
}

function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Renders a plain-HTML weekly digest email. Inline styles only — email
 * clients don't reliably honour <style> blocks or external CSS.
 */
export function renderWeeklyDigest({ digest, userName, portalBaseUrl }) {
    const {
        from, to, siteCount, totalSolarKwh, co2AvoidedKg, dieselAvoidedL,
        topSites, offlineSites, sourceMix,
    } = digest;

    const readableMWh = totalSolarKwh >= 1000
        ? `${fmtNum(totalSolarKwh / 1000, 2)} MWh`
        : `${fmtNum(totalSolarKwh, 0)} kWh`;

    // Small badge summarising how much of this week's data is signed off.
    const mix = sourceMix || { verified: 0, raw: 0, live: 0, unavailable: 0 };
    const totalDays = mix.verified + mix.raw + mix.live + mix.unavailable;
    let badgeText = '';
    let badgeColor = '#9ca3af';
    if (totalDays > 0) {
        if (mix.verified === totalDays) {
            badgeText = 'All figures verified by our team';
            badgeColor = '#2e7d32';
        } else if (mix.verified > 0) {
            badgeText = `${mix.verified}/${totalDays} days verified — the rest are still being reviewed`;
            badgeColor = '#e65100';
        } else {
            badgeText = 'Live figures — verification pending';
            badgeColor = '#4b7a9c';
        }
    }

    return `
    <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f4f7; padding: 40px 20px;">
      <div style="max-width: 640px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.08);">
        <div style="background-color: #0a1128; color: #ffffff; padding: 24px 32px;">
          <h2 style="margin: 0; font-size: 22px;">Your weekly solar summary</h2>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.85;">
            ${fmtDate(from)} – ${fmtDate(to)}
          </p>
        </div>

        <div style="padding: 24px 32px; color: #333;">
          <p style="font-size: 15px; margin: 0 0 20px;">Hi ${userName || 'there'},</p>
          <p style="font-size: 15px; margin: 0 0 16px;">
            Across ${siteCount} site${siteCount === 1 ? '' : 's'}, here's what your solar delivered this week.
          </p>
          ${badgeText ? `
            <div style="display: inline-block; margin: 0 0 20px; padding: 4px 10px; border-radius: 999px; background: ${badgeColor}15; border: 1px solid ${badgeColor}55; color: ${badgeColor}; font-size: 12px; font-weight: 600;">
              ${badgeText}
            </div>
          ` : ''}

          <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="width: 33%; padding: 14px 10px; background: #f6f8fb; border-radius: 8px; text-align: center; vertical-align: top;">
                <div style="font-size: 26px; font-weight: 700; color: #0a1128;">${readableMWh}</div>
                <div style="font-size: 12px; color: #555; margin-top: 4px;">Solar produced</div>
              </td>
              <td style="width: 6px;"></td>
              <td style="width: 33%; padding: 14px 10px; background: #f6f8fb; border-radius: 8px; text-align: center; vertical-align: top;">
                <div style="font-size: 26px; font-weight: 700; color: #0a1128;">${fmtNum(co2AvoidedKg, 0)}&nbsp;kg</div>
                <div style="font-size: 12px; color: #555; margin-top: 4px;">CO<sub>2</sub> avoided</div>
              </td>
              <td style="width: 6px;"></td>
              <td style="width: 33%; padding: 14px 10px; background: #f6f8fb; border-radius: 8px; text-align: center; vertical-align: top;">
                <div style="font-size: 26px; font-weight: 700; color: #0a1128;">${fmtNum(dieselAvoidedL, 0)}&nbsp;L</div>
                <div style="font-size: 12px; color: #555; margin-top: 4px;">Diesel avoided</div>
              </td>
            </tr>
          </table>

          <h3 style="font-size: 15px; color: #0a1128; margin: 24px 0 10px;">Top sites this week</h3>
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            ${topSites.map((s) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e8ebef; font-size: 14px; color: #333;">${s.name || 'Unnamed site'}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e8ebef; font-size: 14px; color: #333; text-align: right;">
                  ${fmtNum(s.solarKwh, 0)}&nbsp;kWh
                </td>
              </tr>
            `).join('')}
          </table>

          ${offlineSites.length > 0 ? `
            <div style="margin-top: 24px; padding: 14px 16px; background: #fff5f4; border-left: 3px solid #ff7d70; border-radius: 4px;">
              <div style="font-size: 14px; font-weight: 600; color: #a03024; margin-bottom: 6px;">
                ${offlineSites.length} site${offlineSites.length === 1 ? '' : 's'} not reporting
              </div>
              <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #66312a;">
                ${offlineSites.slice(0, 5).map((s) => `<li>${s.name}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="margin-top: 28px; text-align: center;">
            <a href="${portalBaseUrl || '#'}/dashboard" style="background-color: #0a1128; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 15px; display: inline-block;">
              Open dashboard
            </a>
          </div>

          <p style="font-size: 12px; color: #888; margin: 28px 0 0; text-align: center;">
            CO<sub>2</sub> and diesel figures are estimated from solar production. You're receiving this
            because weekly digests are enabled on your profile.
          </p>
        </div>
      </div>
    </div>
    `;
}
