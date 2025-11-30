import './styles/SkillsMenu.css';

function SkillsMenu() {
  
  const skillData = [
    {
      category: "Combat Skills",
      skills: [
        "Firearms", "Heavy Weapons", "Blades", "Brawler", "Explosives",
        "Tactics", "Ballistics", "Athletics", "Endurance"
      ]
    },
    {
      category: "Cyber & Digital Skills",
      skills: [
        "Hacking", "Cyber Warfare", "Firewall", "Cryptography",
        "Signal", "Echo Mapping",
        "Overclocking"
      ]
    },
    {
      category: "Tech & Engineering Skills",
      skills: [
        "Engineering", "Mechatronics", "Drone Control", "Scanning",
        "Augmentics", "Salvaging", "Security"
      ]
    },
    {
      category: "Biotech & Psionic Skills",
      skills: [
        "Medicine", "Chemistry", "Biofab", "Nanotech",
        "Neuromancy", "Genetics", "Mindlink", "Focus"
      ]
    },
    {
      category: "Social & Underworld Skills",
      skills: [
        "Negotiation", "Streetwise", "Smuggling", "Forgery"
      ]
    },
    {
      category: "Survival & Movement Skills",
      skills: [
        "Survival", "Awareness", "Parkour"
      ]
    }
  ];

  return (
    <div className="skills-container">
      <ul className="skill-category">

        {skillData.map((group, i) => (
          <li key={i} className="skill-category-block">

            {/* Category Title */}
            <div className="skill-category-title">{group.category}</div>

            {/* Skill List */}
            <ul className="skill-list">
              {group.skills.map((skill, idx) => (
                <li key={idx} className="skill-item">

                  <span className="skill-name">{skill}</span>

                  {/* XP bar */}
                  <div className="skill-bar">
                    <div className="skill-bar-fill" style={{ width: "0%" }}></div>
                  </div>

                  <span className="skill-percent">0%</span>

                </li>
              ))}
            </ul>

          </li>
        ))}

      </ul>
    </div>
  );
}

export default SkillsMenu;
