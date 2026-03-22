import React, { useState, useEffect } from 'react';

export default function HackingCard({ authToken, onTabChange }) {
  const [dashboard, setDashboard] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/hacking/dashboard', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(setDashboard)
      .catch(() => {});
  }, [authToken]);

  if (!dashboard) return null;

  const { progress, curriculum, today_challenge, bounty_stats } = dashboard;
  const currentMod = curriculum.find(m => m.module_number === progress.current_module);
  const progressPct = currentMod
    ? Math.round((currentMod.lessons_completed / currentMod.lessons_total) * 100)
    : 0;

  return (
    <div className="home-card hacking-card" onPointerDown={() => setExpanded(!expanded)}>
      <div className="hacking-card-header">
        <span className="hacking-card-icon">{'\u{1F5A5}'}</span>
        <div className="hacking-card-title">
          <span className="home-card-label">AI Hacking Bootcamp</span>
          <span className="hacking-level">{progress.level}</span>
        </div>
        <span className="hacking-streak">{progress.current_streak > 0 ? `\u{1F525} ${progress.current_streak}` : ''}</span>
      </div>

      <div className="hacking-module-info">
        <span className="hacking-module-name">Module {progress.current_module}: {currentMod?.module_name}</span>
        <div className="hacking-progress-bar">
          <div className="hacking-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="hacking-progress-text">{progressPct}% complete</span>
      </div>

      <div className="hacking-quick-stats">
        <div className="hacking-stat">
          <span className="hacking-stat-value">{progress.total_points}</span>
          <span className="hacking-stat-label">Points</span>
        </div>
        <div className="hacking-stat">
          <span className="hacking-stat-value">{progress.total_challenges_completed}</span>
          <span className="hacking-stat-label">Challenges</span>
        </div>
        <div className="hacking-stat">
          <span className="hacking-stat-value">${bounty_stats.total_earnings}</span>
          <span className="hacking-stat-label">Earned</span>
        </div>
      </div>

      {today_challenge && today_challenge.status === 'pending' && (
        <div className="hacking-challenge-banner" onPointerDown={(e) => { e.stopPropagation(); onTabChange('chat'); }}>
          Today's challenge is waiting!
        </div>
      )}

      {expanded && (
        <div className="hacking-expanded">
          <div className="hacking-curriculum-map">
            {curriculum.map(mod => (
              <div key={mod.module_number} className={`hacking-module-chip ${mod.status}`}>
                <span className="hacking-module-num">{mod.module_number}</span>
                <span className="hacking-module-label">{mod.module_name}</span>
                {mod.status === 'completed' && <span className="hacking-check">{'\u2713'}</span>}
                {mod.status === 'locked' && <span className="hacking-lock">{'\u{1F512}'}</span>}
              </div>
            ))}
          </div>

          {bounty_stats.active > 0 && (
            <div className="hacking-bounty-summary">
              <span>{bounty_stats.active} active bounties</span>
              {bounty_stats.submitted > 0 && <span> | {bounty_stats.win_rate}% win rate</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
