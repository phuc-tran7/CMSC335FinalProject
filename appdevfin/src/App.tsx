import { useState, useEffect } from 'react';
import './App.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface Student {
  name: string;
  date: string;
  is_present: boolean;
  timestamp: string;
}

function App() {
  const [date, setDate] = useState<Value>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const updateAttendance = async (studentName: string, studentDate: string, isPresent: boolean) => {
    if (!studentName || !studentDate) {
      setError('Invalid student information');
      return;
    }
  
    console.log('Updating attendance for student:', studentName, studentDate); 
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
  }, []);

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

      <button onClick={clearDatabase}>Clear Database</button>

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
        </div>
      )}
    </div>
    </SignedIn>

    <SignedOut>
        <div className="auth-message">
          <h2>Please sign in to access the attendance system</h2>
          <SignInButton />
        </div>
    </SignedOut>
    </>
  );
}

export default App;
