// ===== Dummy Data for modules that aren't implemented yet =====

// M2: Content Library
export const dummyContent = [
  { id: 1, title: 'Introduction to Machine Learning', description: 'A comprehensive beginner\'s guide to ML concepts and algorithms.', type: 'video', difficulty: 'beginner', duration_minutes: 45, language: 'English', category: { id: 1, name: 'Technology' }, thumbnail_url: null, is_offline_available: false, created_at: '2025-01-15T10:00:00Z' },
  { id: 2, title: 'Advanced Python Programming', description: 'Deep dive into Python decorators, generators, and metaclasses.', type: 'article', difficulty: 'advanced', duration_minutes: 30, language: 'English', category: { id: 1, name: 'Technology' }, thumbnail_url: null, is_offline_available: true, created_at: '2025-01-14T10:00:00Z' },
  { id: 3, title: 'Data Structures & Algorithms', description: 'Master arrays, linked lists, trees, and graph algorithms.', type: 'video', difficulty: 'intermediate', duration_minutes: 90, language: 'English', category: { id: 1, name: 'Technology' }, thumbnail_url: null, is_offline_available: false, created_at: '2025-01-12T10:00:00Z' },
  { id: 4, title: 'Web Development Fundamentals', description: 'Learn HTML, CSS, and JavaScript from scratch.', type: 'ebook', difficulty: 'beginner', duration_minutes: 120, language: 'English', category: { id: 2, name: 'Web Development' }, thumbnail_url: null, is_offline_available: true, created_at: '2025-01-10T10:00:00Z' },
  { id: 5, title: 'React.js Complete Guide', description: 'Build modern web apps with React hooks, context, and routing.', type: 'video', difficulty: 'intermediate', duration_minutes: 180, language: 'English', category: { id: 2, name: 'Web Development' }, thumbnail_url: null, is_offline_available: false, created_at: '2025-01-08T10:00:00Z' },
  { id: 6, title: 'JavaScript Quiz Challenge', description: 'Test your JS knowledge with 50 questions covering ES6+ features.', type: 'quiz', difficulty: 'intermediate', duration_minutes: 25, language: 'English', category: { id: 1, name: 'Technology' }, thumbnail_url: null, is_offline_available: true, created_at: '2025-01-05T10:00:00Z' },
  { id: 7, title: 'Introduction to UI/UX Design', description: 'Learn design thinking, wireframing, and prototyping.', type: 'article', difficulty: 'beginner', duration_minutes: 40, language: 'English', category: { id: 3, name: 'Design' }, thumbnail_url: null, is_offline_available: false, created_at: '2025-01-03T10:00:00Z' },
  { id: 8, title: 'Cloud Computing with AWS', description: 'Deploy scalable applications using AWS services.', type: 'video', difficulty: 'advanced', duration_minutes: 60, language: 'English', category: { id: 1, name: 'Technology' }, thumbnail_url: null, is_offline_available: false, created_at: '2025-01-01T10:00:00Z' },
  { id: 9, title: 'Communication Skills for Engineers', description: 'Improve your professional communication and presentation skills.', type: 'ebook', difficulty: 'beginner', duration_minutes: 50, language: 'English', category: { id: 4, name: 'Soft Skills' }, thumbnail_url: null, is_offline_available: true, created_at: '2024-12-28T10:00:00Z' },
]

// M2: Career Paths
export const dummyCareerPaths = [
  { id: 1, title: 'Software Engineer', description: 'Full roadmap for becoming a software engineer.', field: 'Technology', required_skills: ['JavaScript', 'Python', 'SQL', 'Git', 'System Design'], avg_salary_range: '₹6–15 LPA', content_count: 12, created_at: '2025-01-01T10:00:00Z' },
  { id: 2, title: 'Data Scientist', description: 'Learn data analysis, statistics, and machine learning.', field: 'Technology', required_skills: ['Python', 'R', 'SQL', 'Statistics', 'TensorFlow'], avg_salary_range: '₹8–20 LPA', content_count: 10, created_at: '2025-01-01T10:00:00Z' },
  { id: 3, title: 'UI/UX Designer', description: 'Master user interface and experience design.', field: 'Design', required_skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping'], avg_salary_range: '₹5–12 LPA', content_count: 8, created_at: '2025-01-01T10:00:00Z' },
  { id: 4, title: 'Cloud Architect', description: 'Design and manage cloud infrastructure at scale.', field: 'Technology', required_skills: ['AWS', 'Azure', 'Docker', 'Kubernetes', 'Terraform'], avg_salary_range: '₹15–30 LPA', content_count: 9, created_at: '2025-01-01T10:00:00Z' },
  { id: 5, title: 'Product Manager', description: 'Lead product strategy, roadmap, and cross-functional teams.', field: 'Business', required_skills: ['Strategy', 'Analytics', 'Communication', 'Agile'], avg_salary_range: '₹12–25 LPA', content_count: 7, created_at: '2025-01-01T10:00:00Z' },
]

// M2: Webinars
export const dummyWebinars = [
  { id: 1, title: 'Getting Started with AI in 2025', description: 'An introductory session on current AI trends and tools.', host_name: 'Dr. Karpagam', scheduled_at: '2025-04-10T14:00:00Z', duration_minutes: 90, topic: 'AI & ML', max_participants: 200, registered_count: 142 },
  { id: 2, title: 'Resume Building Workshop', description: 'Craft a standout resume for tech roles.', host_name: 'Meena Iyer', scheduled_at: '2025-04-15T10:00:00Z', duration_minutes: 60, topic: 'Career', max_participants: 100, registered_count: 67 },
  { id: 3, title: 'Full Stack Development Roadmap', description: 'Complete guide to becoming a full-stack developer in 2025.', host_name: 'Praveen Kumar', scheduled_at: '2025-04-20T16:00:00Z', duration_minutes: 120, topic: 'Web Development', max_participants: 150, registered_count: 98 },
]

// M4: Mentors
export const dummyMentors = [
  { id: 5, name: 'Dr. Karpagam', location: 'Coimbatore', profile_pic_url: null, avg_rating: 4.8, completed_sessions: 23, interests: ['AI', 'Career Guidance', 'Data Science'] },
  { id: 6, name: 'Prof. Rajesh Kumar', location: 'Chennai', profile_pic_url: null, avg_rating: 4.6, completed_sessions: 18, interests: ['Web Development', 'System Design', 'Cloud Computing'] },
  { id: 7, name: 'Meena Iyer', location: 'Bangalore', profile_pic_url: null, avg_rating: 4.9, completed_sessions: 31, interests: ['Product Management', 'UX Design', 'Communication'] },
  { id: 8, name: 'Dr. Anand Sharma', location: 'Mumbai', profile_pic_url: null, avg_rating: 4.5, completed_sessions: 15, interests: ['Machine Learning', 'Research', 'Python'] },
]

// M4: Chat Dummy Responses
export const dummyChatResponses = {
  greeting: { message: "Hello! 👋 I'm DreamBot, your learning companion. I can help you with career guidance, finding study content, connecting with mentors, and more. What would you like to explore?", quick_replies: ['Explore careers', 'Find content', 'Talk to a mentor'] },
  career_guidance: { message: "Based on popular career paths, here are some great options:\n\n• Software Engineer (Technology)\n• Data Scientist (Technology)\n• UI/UX Designer (Design)\n• Product Manager (Business)\n\nWould you like to know more about any of these?", quick_replies: ['Tell me more', 'Show content for this', 'Find a mentor'] },
  study_help: { message: "I'd love to help you find the right study materials! We have videos, articles, eBooks and quizzes across multiple topics.\n\nHere are some popular picks:\n• Introduction to Machine Learning (Video, 45 min)\n• React.js Complete Guide (Video, 180 min)\n• Data Structures & Algorithms (Video, 90 min)\n\nYou can also check the Content Library for more!", quick_replies: ['Open Content Library', 'Track my progress', 'Find more'] },
  motivation: { message: "I understand it can feel overwhelming sometimes. Remember, every expert was once a beginner! 💪\n\nHere are some tips:\n• Break your study into small, manageable sessions\n• Use the Study Planner to stay organized\n• Take breaks — your brain needs rest too!\n• Celebrate small wins along the way\n\nYou've got this!", quick_replies: ['Open Study Planner', 'Talk to a mentor', 'View my progress'] },
  fallback: { message: "I can help you with:\n\n🎯 Career Guidance — explore career paths\n📚 Study Help — find content and materials\n📅 Study Planning — organize your study schedule\n👨‍🏫 Mentorship — connect with mentors\n💼 Jobs — browse opportunities\n\nWhat interests you?", quick_replies: ['Career guidance', 'Find content', 'Talk to a mentor'] },
}

// M5: Jobs
export const dummyJobs = [
  { id: 1, title: 'Junior ML Engineer', company: 'TechCorp India', location: 'Remote', job_type: 'full-time', required_skills: ['Python', 'TensorFlow', 'SQL'], salary_range: '₹4–6 LPA', application_deadline: '2025-05-01', description: 'Join our AI team to build ML models for production systems.', is_active: true, created_at: '2025-03-01T10:00:00Z' },
  { id: 2, title: 'Frontend Developer Intern', company: 'StartupXYZ', location: 'Bangalore', job_type: 'internship', required_skills: ['React', 'JavaScript', 'CSS'], salary_range: '₹15–25K/month', application_deadline: '2025-04-15', description: 'Work on our consumer-facing React application.', is_active: true, created_at: '2025-03-05T10:00:00Z' },
  { id: 3, title: 'Backend Developer', company: 'DataCo', location: 'Chennai', job_type: 'full-time', required_skills: ['Node.js', 'PostgreSQL', 'Docker'], salary_range: '₹6–10 LPA', application_deadline: '2025-04-30', description: 'Build scalable APIs and microservices.', is_active: true, created_at: '2025-03-08T10:00:00Z' },
  { id: 4, title: 'UI/UX Design Intern', company: 'DesignHub', location: 'Remote', job_type: 'internship', required_skills: ['Figma', 'Adobe XD', 'User Research'], salary_range: '₹10–20K/month', application_deadline: '2025-04-20', description: 'Design beautiful interfaces for our SaaS products.', is_active: true, created_at: '2025-03-10T10:00:00Z' },
  { id: 5, title: 'Data Analyst', company: 'AnalyticsPro', location: 'Hyderabad', job_type: 'full-time', required_skills: ['Python', 'SQL', 'Tableau', 'Excel'], salary_range: '₹5–8 LPA', application_deadline: '2025-05-10', description: 'Analyze data to drive business decisions.', is_active: true, created_at: '2025-03-12T10:00:00Z' },
  { id: 6, title: 'Freelance Content Writer', company: 'EduWrite', location: 'Remote', job_type: 'freelance', required_skills: ['Writing', 'Research', 'SEO'], salary_range: '₹500–1000/article', application_deadline: '2025-06-01', description: 'Create educational content for our platform.', is_active: true, created_at: '2025-03-15T10:00:00Z' },
]
