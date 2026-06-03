import React, { useState } from 'react';
import { Award, Star, ThumbsUp, MessageSquare, Download, LogOut } from 'lucide-react';

function ScorecardModal({ role, peer, username, onSubmit, scorecardData, onBackToLobby }) {
  const [coding, setCoding] = useState(0);
  const [solving, setSolving] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [design, setDesign] = useState(0);
  const [recommendation, setRecommendation] = useState('Hire');
  const [notes, setNotes] = useState('');

  const handleStarClick = (metric, rating) => {
    if (metric === 'coding') setCoding(rating);
    if (metric === 'solving') setSolving(rating);
    if (metric === 'communication') setCommunication(rating);
    if (metric === 'design') setDesign(rating);
  };

  const renderStarSelector = (metric, currentValue) => {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={22}
            onClick={() => handleStarClick(metric, star)}
            style={{
              cursor: 'pointer',
              color: star <= currentValue ? 'var(--warning)' : 'var(--text-muted)',
              fill: star <= currentValue ? 'var(--warning)' : 'none',
              transition: 'transform 0.15s ease'
            }}
            className="star-icon"
          />
        ))}
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
          {currentValue === 1 && 'Poor'}
          {currentValue === 2 && 'Needs Work'}
          {currentValue === 3 && 'Average'}
          {currentValue === 4 && 'Strong'}
          {currentValue === 5 && 'Excellent'}
        </span>
      </div>
    );
  };

  const renderStarDisplay = (value) => {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            style={{
              color: star <= value ? 'var(--warning)' : 'var(--text-muted)',
              fill: star <= value ? 'var(--warning)' : 'none',
            }}
          />
        ))}
      </div>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (coding === 0 || solving === 0 || communication === 0 || design === 0) {
      alert('Please provide a rating for all evaluation metrics.');
      return;
    }

    const payload = {
      interviewer: username,
      candidate: peer ? peer.name : 'Candidate',
      coding,
      solving,
      communication,
      design,
      recommendation,
      notes,
      timestamp: new Date().toISOString()
    };

    onSubmit(payload);
  };

  const downloadReport = () => {
    if (!scorecardData) return;

    const reportText = `=========================================
DEVPair INTERVIEW SCORECARD
=========================================
Interviewer: ${scorecardData.interviewer}
Candidate: ${scorecardData.candidate}
Date: ${new Date(scorecardData.timestamp).toLocaleString()}

EVALUATION RATINGS (Out of 5 Stars)
-----------------------------------------
Coding Ability:      ${'★'.repeat(scorecardData.coding)}${'☆'.repeat(5 - scorecardData.coding)} (${scorecardData.coding}/5)
Problem Solving:     ${'★'.repeat(scorecardData.solving)}${'☆'.repeat(5 - scorecardData.solving)} (${scorecardData.solving}/5)
Communication:       ${'★'.repeat(scorecardData.communication)}${'☆'.repeat(5 - scorecardData.communication)} (${scorecardData.communication}/5)
System Design:       ${'★'.repeat(scorecardData.design)}${'☆'.repeat(5 - scorecardData.design)} (${scorecardData.design}/5)

OVERALL RECOMMENDATION
-----------------------------------------
Decision:            ${scorecardData.recommendation.toUpperCase()}

QUALITATIVE FEEDBACK & NOTES
-----------------------------------------
${scorecardData.notes || 'No notes provided.'}

=========================================
Thank you for using DevPair!
=========================================`;

    const element = document.createElement("a");
    const file = new Blob([reportText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `DevPair_Scorecard_${scorecardData.candidate}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel scorecard-modal animate-slide-in">
        
        {/* If scorecard has been submitted: render REPORT for BOTH users */}
        {scorecardData ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div className="success-icon-wrap" style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', marginBottom: '10px' }}>
                <Award size={36} />
              </div>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Interview Feedback Scorecard</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                Evaluation completed by <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{scorecardData.interviewer}</span>
              </p>
            </div>

            {/* Scorecard Table Cards */}
            <div className="scorecard-report-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="scorecard-card-metric">
                <span className="metric-label">Coding Skills</span>
                {renderStarDisplay(scorecardData.coding)}
              </div>
              <div className="scorecard-card-metric">
                <span className="metric-label">Problem Solving</span>
                {renderStarDisplay(scorecardData.solving)}
              </div>
              <div className="scorecard-card-metric">
                <span className="metric-label">Communication</span>
                {renderStarDisplay(scorecardData.communication)}
              </div>
              <div className="scorecard-card-metric">
                <span className="metric-label">System Design</span>
                {renderStarDisplay(scorecardData.design)}
              </div>
            </div>

            {/* Recommendation block */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Overall Recommendation
              </span>
              <span className={`recommendation-pill ${scorecardData.recommendation.toLowerCase().replace(' ', '-')}`}>
                {scorecardData.recommendation}
              </span>
            </div>

            {/* Qualitative Notes */}
            <div style={{ marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Feedback & Notes
              </span>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '1rem',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                minHeight: '80px',
                maxHeight: '200px',
                overflowY: 'auto',
                lineHeight: '1.5'
              }}>
                {scorecardData.notes || 'No written comments provided.'}
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={downloadReport} className="btn-secondary" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Download size={16} />
                <span>Save Report</span>
              </button>
              <button onClick={onBackToLobby} className="btn-primary" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <LogOut size={16} />
                <span>Return to Lobby</span>
              </button>
            </div>
          </div>
        ) : (
          /* Scorecard is pending */
          role === 'Interviewer' ? (
            /* Interviewer fills out rating sheet */
            <form onSubmit={handleSubmit}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>Session Scorecard Evaluation</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Please evaluate the candidate <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{peer ? peer.name : 'Candidate'}</span>.
                </p>
              </div>

              {/* Ratings List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="rating-row">
                  <label className="rating-label">Coding Skills</label>
                  {renderStarSelector('coding', coding)}
                </div>
                <div className="rating-row">
                  <label className="rating-label">Problem Solving</label>
                  {renderStarSelector('solving', solving)}
                </div>
                <div className="rating-row">
                  <label className="rating-label">Communication</label>
                  {renderStarSelector('communication', communication)}
                </div>
                <div className="rating-row">
                  <label className="rating-label">System Design</label>
                  {renderStarSelector('design', design)}
                </div>
              </div>

              {/* Recommendation dropdown */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Decision Recommendation</label>
                <select
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  className="question-select-dropdown"
                  style={{ margin: 0 }}
                >
                  <option value="Strong Hire">Strong Hire (Must-Have Candidate)</option>
                  <option value="Hire">Hire (Competent & Solid)</option>
                  <option value="No Hire">No Hire (Below Bar)</option>
                  <option value="Strong No Hire">Strong No Hire (Violates Core Criteria)</option>
                </select>
              </div>

              {/* Notes */}
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Qualitative Notes & Feedback</label>
                <textarea
                  className="notepad-textarea"
                  style={{ height: '100px', resize: 'vertical', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  placeholder="Provide brief feedback highlighting candidate strengths, growth areas, or why you made this decision..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </div>

              {/* Submit button */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={onBackToLobby} className="btn-secondary" style={{ flexGrow: 1 }}>
                  Discard
                </button>
                <button type="submit" className="btn-primary" style={{ flexGrow: 2 }}>
                  Submit & Share Evaluation
                </button>
              </div>
            </form>
          ) : (
            /* Candidate is waiting for results */
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div className="radar-circle" style={{ margin: '0 auto 2rem auto' }}>
                <div className="radar-core"></div>
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Interviewer is finalizing your evaluation...
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto' }}>
                Please stay in the room. The feedback report card will be shared with you shortly.
              </p>
            </div>
          )
        )}

      </div>
    </div>
  );
}

export default ScorecardModal;
