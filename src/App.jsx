import { useState } from 'react';
import Login from './Login';
import Home from './Home';
import CreateNote from './CreateNote';
import NoteDetail from './NoteDetail';
import { useAuth } from './hooks/useAuth.jsx';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [currentNoteId, setCurrentNoteId] = useState(null);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const goToHome = () => {
    setCurrentPage('home');
    setCurrentNoteId(null);
  };

  const goToCreate = () => {
    setCurrentPage('create');
    setCurrentNoteId(null);
  };

  const goToDetail = (noteId) => {
    setCurrentNoteId(noteId);
    setCurrentPage('detail');
  };

  const goToEdit = (noteId) => {
    setCurrentNoteId(noteId);
    setCurrentPage('edit');
  };

  if (currentPage === 'create') {
    return <CreateNote onBack={goToHome} />;
  }

  if (currentPage === 'edit' && currentNoteId) {
    return <CreateNote noteId={currentNoteId} onBack={() => goToDetail(currentNoteId)} />;
  }

  if (currentPage === 'detail' && currentNoteId) {
    return (
      <NoteDetail 
        noteId={currentNoteId} 
        onBack={goToHome}
        onEdit={goToEdit}
      />
    );
  }

  return <Home onCreateNote={goToCreate} onViewDetail={goToDetail} onEdit={goToEdit} />;
}

export default App;
