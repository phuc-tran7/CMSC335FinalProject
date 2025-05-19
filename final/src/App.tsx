import { useState, useEffect } from 'react';
import './App.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Navbar from './components/Navbar';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface Student {
  name: string;
  date: string;
  is_present: boolean;
  timestamp: string;
}

interface Announcement {
  content: string;
  author: string;
  timestamp: string;
}

interface StudentMessage {
  id: string;
  content: string;
  sender: string;
  contact_info: string;
  timestamp: string;
}

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
  const [messageContent, setMessageContent] = useState("");
  const [senderName, setSenderName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchStudentMessages = async () => {
    setLoadingMessages(true);
    try {
      const response = await fetch("http://localhost:8000/student-messages");
      const data = await response.json();
      setStudentMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!messageContent.trim()) {
      setMessageStatus("Please enter a message");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/student-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageContent,
          sender: senderName || "Anonymous",
          contact_info: contactInfo,
        }),
      });

      if (response.ok) {
        setMessageStatus("Message sent successfully!");
        setMessageContent("");
        setSenderName("");
        setContactInfo("");
        setTimeout(() => setMessageStatus(""), 3000);
      }
    } catch (error) {
      setMessageStatus("Failed to send message");
    }
  };

  const deleteMessage = async (id: string) => {
    if (window.confirm("Delete this message?")) {
      try {
        await fetch(`http://localhost:8000/student-messages/${id}`, {
          method: "DELETE",
        });
        setStudentMessages(studentMessages.filter((msg) => msg.id !== id));
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchStudentMessages();
    }
  }, [user]);

  const fetchStudents = async (dateStr: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:8000/students/${dateStr}`);
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setStudents(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load attendance data');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('http://localhost:8000/announcements');
      if (!response.ok) throw new Error('Failed to fetch announcements');
      const data = await response.json();
      setAnnouncements(data);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

  const handleDateChange = (value: Value) => {
    setDate(value);
    if (value instanceof Date) {
      const dateStr = value.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      fetchStudents(dateStr);
    }
  };

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
      const response = await fetch('http://localhost:8000/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newStudentName,
          date: selectedDate,
          is_present: false
        }),
      });

      if (!response.ok) throw new Error('Failed to add student');
      
      setNewStudentName('');
      setError('');
      await fetchStudents(selectedDate);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to add student');
    }
  };

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
      const response = await fetch('http://localhost:8000/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newAnnouncement,
          author: user.fullName || 'Anonymous'
        }),
      });

      if (!response.ok) throw new Error('Failed to post announcement');
      
      const newAnnounce = await response.json();
      setAnnouncements(prev => [newAnnounce, ...prev]);
      setNewAnnouncement('');
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to post announcement');
    }
  };

  const clearAnnouncements = async () => {
    if (!window.confirm('Are you sure you want to clear all announcements? This action cannot be undone.')) {
      return;
    }

    setIsClearingAnnouncements(true);
    try {
      const response = await fetch('http://localhost:8000/announcements', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to clear announcements');
      
      setAnnouncements([]);
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to clear announcements');
    } finally {
      setIsClearingAnnouncements(false);
    }
  };

  const updateAttendance = async (studentName: string, studentDate: string, isPresent: boolean) => {
    if (!studentName || !studentDate) {
      setError('Invalid student information');
      return;
    }
  
    try {
      const response = await fetch(`http://localhost:8000/students/${studentName}/${studentDate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_present: isPresent }),
      });
  
      if (!response.ok) throw new Error('Failed to update attendance');
  
      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.name === studentName && student.date === studentDate
            ? { ...student, is_present: isPresent }
            : student
        )
      );
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to update attendance');
      fetchStudents(selectedDate);
    }
  };

  const clearDatabase = async () => {
    if (!window.confirm('Are you sure you want to clear all data?')) return;
    
    try {
      const response = await fetch('http://localhost:8000/students', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to clear the database');

      setStudents([]);
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to clear the database');
    }
  };

  useEffect(() => {
    if (date instanceof Date) {
      const todayStr = date.toISOString().split('T')[0];
      setSelectedDate(todayStr);
      fetchStudents(todayStr);
    }
    fetchAnnouncements();
  }, []);

  return (
    <>
      <SignedIn>
        <div className="app">
          <Navbar></Navbar>
          <br></br><br></br><br></br><br></br>
          
          <div className="calendar-container">
            <Calendar 
              onChange={handleDateChange} 
              value={date}
            />
          </div>

          

          <div className = "smallGuys">

              

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
                    <p>Loading attendance data</p>
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
                          <tr key={student.name + student.date}>
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
                  <br></br>

                  <div className="button-container">
                    <button onClick={clearDatabase}>Clear Database</button>

                  </div>
                </div>
              )}

              <div className="announcements-section">
                <div className="announcements-header">
                  <h2>Announcements</h2>
                  
                </div>
                <div className="announcements-list">
                  {announcements.length === 0 ? (
                    <p className="no-announcements">No announcements yet.</p>
                  ) : (
                    announcements.map((announcement, index) => (
                      <div key={index} className="announcement">
                        <p className="announcement-content">{announcement.content}</p>
                        <p className="announcement-meta">
                          Posted by {announcement.author} on {new Date(announcement.timestamp).toLocaleString()}
                        </p>
                        <br></br>
                        <br></br>
                      </div>
                    ))
                  )}
                </div>

                <div className="post-announcement">
                  <br></br>
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
                  <button 
                    onClick={clearAnnouncements} 
                    className="clear-announcements-btn"
                    disabled={isClearingAnnouncements || announcements.length === 0}
                  >
                    {isClearingAnnouncements ? 'Clearing...' : 'Clear Announcements'}
                  </button>
                </div>
                
              </div>

              <div className="admin-messages">
    
    <h2>Student Messages</h2>
    {loadingMessages ? (
      <p>Loading messages...</p>
    ) : studentMessages.length > 0 ? (
      <div className="message-list">
        {studentMessages.map((message) => (
          <div key={message.id} className="message-card">
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
              onClick={() => deleteMessage(message.id)}
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

         
        </div>
        
      </SignedIn>

      <SignedOut>
        <Navbar></Navbar><br></br><br></br><br></br>
            <div className ="frontPageBox">

            
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
                <button onClick={sendMessage}>Send Message</button>
                {messageStatus && <p className="message-status">{messageStatus}</p>}
              </div>
                    
                    <div className="announcements-section">
                      <h2>Announcements</h2>
                      <div className="announcements-list">
                        {announcements.length === 0 ? (
                          <p className="no-announcements">No announcements yet.</p>
                        ) : (
                          announcements.map((announcement, index) => (
                            <div key={index} className="announcement">
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
             </div>
      </SignedOut>
    </>
  );
}

export default App;
