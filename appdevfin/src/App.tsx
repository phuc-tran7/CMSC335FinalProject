import { useState, useEffect } from 'react';
import './App.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";

// Types
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface Student {
  _id: string;
  name: string;
  date: string;
  is_present: boolean;
  timestamp: string;
}

interface Announcement {
  _id: string;
  content: string;
  author: string;
  timestamp: string;
}

interface StudentMessage {
  _id: string;
  content: string;
  sender: string;
  contact_info: string;
  timestamp: string;
}

type ApiResponse<T> = {
  data?: T;
  error?: string;
  status: 'success' | 'error';
};

// Config
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function App() {
  const [date, setDate] = useState<Value>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [isClearingAnnouncements, setIsClearingAnnouncements] = useState(false);
  const { user } = useUser();
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [senderName, setSenderName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [messageStatus, setMessageStatus] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Format date to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Fetch students by date
  const fetchStudents = async (dateStr: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/students/${dateStr}`);
      if (!response.ok) {
        const data: ApiResponse<never> = await response.json();
        throw new Error(data.error || 'Failed to fetch students');
      }
      const data: ApiResponse<Student[]> = await response.json();
      setStudents(data.data || []);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attendance data');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all announcements
  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/announcements`);
      if (!response.ok) {
        const data: ApiResponse<never> = await response.json();
        throw new Error(data.error || 'Failed to fetch announcements');
      }
      const data: ApiResponse<Announcement[]> = await response.json();
      setAnnouncements(data.data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    }
  };

  // Fetch student messages
  const fetchStudentMessages = async () => {
    setLoadingMessages(true);
    setMessageStatus('');
    try {
      const response = await fetch(`${API_BASE_URL}/student-messages`);
      if (!response.ok) {
        const data: ApiResponse<never> = await response.json();
        throw new Error(data.error || 'Failed to fetch messages');
      }
      const data: ApiResponse<StudentMessage[]> = await response.json();
      setStudentMessages(data.data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setMessageStatus(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  // Handle date change
  const handleDateChange = (value: Value) => {
    setDate(value);
    if (value instanceof Date) {
      const dateStr = formatDate(value);
      setSelectedDate(dateStr);
      fetchStudents(dateStr);
    }
  };

  // Add new student
  const addStudent = async () => {
    if (!newStudentName.trim()) {
      setError('Please enter a student name');
      return;
    }
    if (!selectedDate) {
      setError('Please select a date first');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudentName,
          date: selectedDate,
          is_present: false
        }),
      });

      const data: ApiResponse<Student> = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add student');
      }

      setNewStudentName('');
      setError('');
      await fetchStudents(selectedDate);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add student');
    }
  };

  // Update attendance status
  const updateAttendance = async (studentName: string, studentDate: string, isPresent: boolean) => {
    if (!studentName || !studentDate) {
      setError('Invalid student information');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/students/${encodeURIComponent(studentName)}/${encodeURIComponent(studentDate)}`, 
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_present: isPresent }),
        }
      );

      const data: ApiResponse<Student> = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update attendance');
      }

      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.name === studentName && student.date === studentDate
            ? { ...student, is_present: isPresent }
            : student
        )
      );
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update attendance');
    }
  };

  // Post new announcement
  const postAnnouncement = async () => {
    if (!newAnnouncement.trim()) {
      setError('Please enter announcement content');
      return;
    }
    if (!user) {
      setError('You must be signed in to post announcements');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newAnnouncement,
          author: user.fullName || 'Anonymous'
        }),
      });

      const data: ApiResponse<Announcement> = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to post announcement');
      }

      setAnnouncements(prev => [data.data!, ...prev]);
      setNewAnnouncement('');
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to post announcement');
    }
  };

  // Clear all announcements
  const clearAnnouncements = async () => {
    if (!window.confirm('Are you sure you want to clear all announcements? This action cannot be undone.')) {
      return;
    }

    setIsClearingAnnouncements(true);
    try {
      const response = await fetch(`${API_BASE_URL}/announcements`, {
        method: 'DELETE',
      });

      const data: ApiResponse<never> = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear announcements');
      }

      setAnnouncements([]);
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear announcements');
    } finally {
      setIsClearingAnnouncements(false);
    }
  };

  // Send student message
  const sendMessage = async () => {
    if (!messageContent.trim()) {
      setMessageStatus("Please enter a message");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/student-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageContent,
          sender: senderName || "Anonymous",
          contact_info: contactInfo,
        }),
      });

      const data: ApiResponse<StudentMessage> = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setMessageStatus("Message sent successfully!");
      setMessageContent("");
      setSenderName("");
      setContactInfo("");
      fetchStudentMessages();
      setTimeout(() => setMessageStatus(""), 3000);
    } catch (err) {
      console.error('Error:', err);
      setMessageStatus(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  // Delete student message
  const deleteMessage = async (id: string) => {
    if (!window.confirm("Delete this message?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/student-messages/${id}`, {
        method: "DELETE",
      });
      
      const data: ApiResponse<never> = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete message');
      }

      setStudentMessages(prev => prev.filter(msg => msg._id !== id));
    } catch (err) {
      console.error('Error:', err);
      setMessageStatus(err instanceof Error ? err.message : "Failed to delete message");
    }
  };

  // Clear all student data
  const clearDatabase = async () => {
    if (!window.confirm('Are you sure you want to clear all student data?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        method: 'DELETE',
      });

      const data: ApiResponse<never> = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear the database');
      }

      setStudents([]);
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear the database');
    }
  };

  // Initialize data
  useEffect(() => {
    if (date instanceof Date) {
      const todayStr = formatDate(date);
      setSelectedDate(todayStr);
      fetchStudents(todayStr);
    }
    fetchAnnouncements();
  }, []);

  // Fetch messages when user is authenticated
  useEffect(() => {
    if (user) {
      fetchStudentMessages();
    }
  }, [user]);

  return (
    <>
      <SignedIn>
        <div className="app">
          <h1>Student Attendance System</h1>
          
          <div className="calendar-container">
            <Calendar 
              onChange={handleDateChange} 
              value={date}
            />
          </div>

          <div className="button-container">
            <button onClick={clearDatabase}>Clear Student Data</button>
            <div className="user-button-wrapper">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>

          {selectedDate && (
            <div className="attendance-section">
              <h2>Attendance for {selectedDate}</h2>
              
              <div className="add-student">
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => {
                    setNewStudentName(e.target.value);
                    setError('');
                  }}
                  placeholder="Student name"
                  onKeyDown={(e) => e.key === 'Enter' && addStudent()}
                />
                <button onClick={addStudent}>Add Student</button>
              </div>

              {error && <p className="error-message">{error}</p>}

              {loading ? (
                <p>Loading attendance data...</p>
              ) : students.length > 0 ? (
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student._id}>
                        <td>{student.name}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={student.is_present}
                            onChange={(e) => updateAttendance(student.name, student.date, e.target.checked)} 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No students added for this date yet.</p>
              )}
            </div>
          )}

          <div className="announcements-section">
            <div className="announcements-header">
              <h2>Announcements</h2>
              <button 
                onClick={clearAnnouncements} 
                className="clear-announcements-btn"
                disabled={isClearingAnnouncements || announcements.length === 0}
              >
                {isClearingAnnouncements ? 'Clearing...' : 'Clear Announcements'}
              </button>
            </div>
            <div className="post-announcement">
              <textarea
                value={newAnnouncement}
                onChange={(e) => {
                  setNewAnnouncement(e.target.value);
                  setError('');
                }}
                placeholder="Write an announcement..."
                rows={3}
              />
              <button onClick={postAnnouncement}>Post Announcement</button>
            </div>
            <div className="announcements-list">
              {announcements.length === 0 ? (
                <p className="no-announcements">No announcements yet.</p>
              ) : (
                announcements.map((announcement) => (
                  <div key={announcement._id} className="announcement">
                    <p className="announcement-content">{announcement.content}</p>
                    <p className="announcement-meta">
                      Posted by {announcement.author} on {new Date(announcement.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="admin-messages">
            <h2>Student Messages</h2>
            {messageStatus && (
              <div className={`message-status ${messageStatus.includes('success') ? 'success' : 'error'}`}>
                {messageStatus}
              </div>
            )}
            {loadingMessages ? (
              <p>Loading messages...</p>
            ) : studentMessages.length > 0 ? (
              <div className="message-list">
                {studentMessages.map((message) => (
                  <div key={message._id} className="message-card">
                    <div className="message-content">
                      <p>{message.content}</p>
                      <div className="message-meta">
                        <span>From: {message.sender}</span>
                        {message.contact_info && (
                          <span>Contact: {message.contact_info}</span>
                        )}
                        <span>{new Date(message.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMessage(message._id)}
                      className="delete-message-btn"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>No messages from students</p>
            )}
          </div>
        </div>
      </SignedIn>

      <SignedOut>
        <div className="auth-message">
          <h2>Please sign in to access the attendance system</h2>
          <SignInButton />

          <div className="student-message-form">
            <h3>Contact Administrators</h3>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Your message to admins:"
              rows={4}
            />
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Your name:"
            />
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Your contact info (optional):"
            />
            <button onClick={sendMessage}>Send Message</button>
            {messageStatus && (
              <div className={`message-status ${messageStatus.includes('success') ? 'success' : 'error'}`}>
                {messageStatus}
              </div>
            )}
          </div>
          
          <div className="announcements-section">
            <h2>Announcements</h2>
            <div className="announcements-list">
              {announcements.length === 0 ? (
                <p className="no-announcements">No announcements yet.</p>
              ) : (
                announcements.map((announcement) => (
                  <div key={announcement._id} className="announcement">
                    <p className="announcement-content">{announcement.content}</p>
                    <p className="announcement-meta">
                      Posted by {announcement.author} on {new Date(announcement.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SignedOut>
    </>
  );
}

export default App;