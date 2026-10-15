import { useId } from 'react';

export default function CoursePicker({ courses, course, onChange, label = 'Coding language', showLabel = false }) {
  const id = useId();
  return <div className="course-picker">
    <label className={showLabel ? 'course-picker-label' : 'sr-only'} htmlFor={id}>{label}</label>
    <select id={id} value={course.id} onChange={event => onChange(event.target.value)}>
      {courses.map(item => <option key={item.id} value={item.id}>{item.language}</option>)}
    </select>
  </div>;
}
