import React, { useState, useEffect } from 'react';
import "./JournalCollection.css";

function JournalCollection({ refJournalEntries, onEntrySelect}) {
  //return <div className="journal-collection">Journal Collection Component</div>;

  const [journalEntries, setJournalEntries] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Function to fetch journal entries
    async function fetchJournalEntries() {
      try {
        const response = await fetch('/journal/all');
        if (!response.ok) {
          throw new Error('Journal entries fetch failed');
        }
        const data = await response.json();
        // Sort the entries by createdAt in descending order (newest first)
        const sortedData = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setJournalEntries(sortedData);
      } catch (error) {
        console.error(error);
      }
    }
    
    fetchJournalEntries();
  }, [refJournalEntries]);

  // Function to toggle the expanded view
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`journal-collection ${isExpanded ? 'expanded' : 'preview'}`} onClick={toggleExpand}>
      {isExpanded
        ? journalEntries.map(entry => (
            <div className="journal-entry-full" key={entry.id} onClick={() => onEntrySelect(entry)}>
              <p>{entry.entryTitle}</p>
             {/* <p>{new Date(entry.createdAt).toLocaleDateString()}</p> */}
              <img src={entry.journalCover} alt="Journal Cover" />
            </div>
          ))
        : journalEntries.slice(0, 4).map(entry => (
            <div className="journal-entry-preview" key={entry.id} style={{ backgroundImage: `url(${entry.journalCover})` }}>
              {/* Only the cover is shown */}
            </div>
          ))}
    </div>
  );
};

export default JournalCollection;
