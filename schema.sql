CREATE DATABASE IF NOT EXISTS maycrypt CHARACTER SET utf8mb4;
USE maycrypt;
CREATE TABLE IF NOT EXISTS users(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(120) NOT NULL,email VARCHAR(190) UNIQUE NOT NULL,password_hash VARCHAR(255) NOT NULL,is_admin BOOLEAN DEFAULT FALSE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS courses(id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(150) NOT NULL,description TEXT,level VARCHAR(40) DEFAULT 'Beginner',icon VARCHAR(20) DEFAULT '🛡️');
CREATE TABLE IF NOT EXISTS questions(id INT AUTO_INCREMENT PRIMARY KEY,course_id INT NOT NULL,question_text TEXT NOT NULL,a VARCHAR(255) NOT NULL,b VARCHAR(255) NOT NULL,c VARCHAR(255) NOT NULL,d VARCHAR(255) NOT NULL,answer CHAR(1) NOT NULL,FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS results(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,course_id INT NOT NULL,score INT,total INT,percentage INT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(course_id) REFERENCES courses(id));
CREATE TABLE IF NOT EXISTS game_scores(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,game_name VARCHAR(100),points INT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS certificates(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,course_id INT NOT NULL,code VARCHAR(40) UNIQUE,percentage INT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(course_id) REFERENCES courses(id));
CREATE TABLE IF NOT EXISTS contact_messages(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(120),email VARCHAR(190),message TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO courses(title,description,level,icon)
SELECT 'Networking Fundamentals','IP, DNS, DHCP, VLAN, routing and switching.','Beginner','🌐' WHERE NOT EXISTS(SELECT 1 FROM courses WHERE title='Networking Fundamentals');
INSERT INTO courses(title,description,level,icon)
SELECT 'Linux Basics','Commands, files, permissions and shell.','Beginner','🐧' WHERE NOT EXISTS(SELECT 1 FROM courses WHERE title='Linux Basics');
INSERT INTO courses(title,description,level,icon)
SELECT 'Web Security','Web risks and secure coding basics.','Intermediate','🕸️' WHERE NOT EXISTS(SELECT 1 FROM courses WHERE title='Web Security');
INSERT INTO courses(title,description,level,icon)
SELECT 'Cryptography','Encryption, hashing and digital signatures.','Intermediate','🔐' WHERE NOT EXISTS(SELECT 1 FROM courses WHERE title='Cryptography');
INSERT INTO courses(title,description,level,icon)
SELECT 'Cyber Awareness','Phishing, password safety and online protection.','Beginner','🧠' WHERE NOT EXISTS(SELECT 1 FROM courses WHERE title='Cyber Awareness');
INSERT INTO courses(title,description,level,icon)
SELECT 'Malware & Protection','Malware types, prevention and response.','Beginner','🛡️' WHERE NOT EXISTS(SELECT 1 FROM courses WHERE title='Malware & Protection');

-- Sample quiz questions (five per course)
INSERT INTO questions(course_id,question_text,a,b,c,d,answer)
SELECT c.id,q.q,q.a,q.b,q.c,q.d,q.ans FROM courses c JOIN (
SELECT 'Networking Fundamentals' t,'Which device connects different IP networks?' q,'Switch' a,'Router' b,'Hub' c,'Repeater' d,'B' ans UNION ALL
SELECT 'Networking Fundamentals','Which protocol automatically assigns IP addresses?','DNS','HTTP','DHCP','FTP','C' UNION ALL
SELECT 'Networking Fundamentals','What does LAN stand for?','Local Area Network','Large Access Node','Long Area Network','Local Admin Number','A' UNION ALL
SELECT 'Networking Fundamentals','Which command tests reachability?','mkdir','ping','touch','nano','B' UNION ALL
SELECT 'Networking Fundamentals','Which service translates domain names to IP addresses?','DHCP','SSH','DNS','SMTP','C' UNION ALL
SELECT 'Linux Basics','Which command lists files?','pwd','ls','cd','cat','B' UNION ALL
SELECT 'Linux Basics','Which command creates a directory?','mkdir','touch','rm','grep','A' UNION ALL
SELECT 'Linux Basics','Which command prints the current directory?','whoami','clear','pwd','date','C' UNION ALL
SELECT 'Linux Basics','Which command changes file permissions?','chmod','chown','nano','mv','A' UNION ALL
SELECT 'Linux Basics','Which command creates an empty file?','ls','touch','cd','pwd','B' UNION ALL
SELECT 'Web Security','What does HTTPS add to HTTP?','Compression','Encryption in transit','More storage','A firewall','B' UNION ALL
SELECT 'Web Security','What does XSS commonly involve?','Cross-site scripting','Extra secure shell','XML server sync','External system scan','A' UNION ALL
SELECT 'Web Security','What is SQL injection?','A backup method','A database query attack','A network cable','An encryption standard','B' UNION ALL
SELECT 'Web Security','What helps defend against SQL injection?','String concatenation','Parameterized queries','Weak passwords','Disable updates','B' UNION ALL
SELECT 'Web Security','What does MFA provide?','More than one verification factor','Faster internet','File compression','Anonymous browsing','A' UNION ALL
SELECT 'Cryptography','What is encryption?','Deleting data','Turning readable data into coded data','Compressing images','Renaming files','B' UNION ALL
SELECT 'Cryptography','Which is a symmetric encryption algorithm?','RSA','AES','Diffie-Hellman','ECC','B' UNION ALL
SELECT 'Cryptography','A cryptographic hash is generally designed to be…','Reversible','One-way','A network protocol','A password manager','B' UNION ALL
SELECT 'Cryptography','Which key type is used in public-key cryptography?','Only one shared key','Public and private key pair','No keys','Only a session name','B' UNION ALL
SELECT 'Cryptography','What is a digital signature used for?','Integrity and authenticity','Increasing bandwidth','Compressing files','Assigning IP addresses','A' UNION ALL
SELECT 'Cyber Awareness','What is phishing?','A fraudulent attempt to steal information','A backup process','A coding language','A router setting','A' UNION ALL
SELECT 'Cyber Awareness','What should you do with a suspicious link?','Click quickly','Avoid it and verify the sender','Share it','Enter your password','B' UNION ALL
SELECT 'Cyber Awareness','Which password is strongest?','12345678','mayur123','M@yCrypt!82#Blue','password','C' UNION ALL
SELECT 'Cyber Awareness','Should you share an OTP with anyone?','Yes','Only callers','Never','On social media','C' UNION ALL
SELECT 'Cyber Awareness','What is a safer account practice?','Reuse one password','Enable MFA','Share credentials','Ignore alerts','B' UNION ALL
SELECT 'Malware & Protection','What is malware?','Malicious software','A monitor','A browser','A backup','A' UNION ALL
SELECT 'Malware & Protection','What does ransomware usually do?','Improves speed','Encrypts or locks data for extortion','Updates drivers','Blocks advertisements','B' UNION ALL
SELECT 'Malware & Protection','Which is a good security habit?','Install unknown files','Disable updates','Keep software updated','Share admin password','C' UNION ALL
SELECT 'Malware & Protection','What is a backup?','A copy of important data','A virus','A firewall rule','A login token','A' UNION ALL
SELECT 'Malware & Protection','What should you do with an unexpected attachment?','Open immediately','Verify the sender first','Forward to everyone','Disable antivirus','B'
) q ON q.t=c.title
WHERE NOT EXISTS (SELECT 1 FROM questions old WHERE old.course_id=c.id);

-- MAYCRYPT v2 additions (safe to run on an existing database)
CREATE TABLE IF NOT EXISTS lesson_progress(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,course_id INT NOT NULL,lesson_no INT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uq_lesson(user_id,course_id,lesson_no),FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(course_id) REFERENCES courses(id));
CREATE TABLE IF NOT EXISTS lab_progress(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,lab VARCHAR(20) NOT NULL,task VARCHAR(30) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uq_lab(user_id,lab,task),FOREIGN KEY(user_id) REFERENCES users(id));
