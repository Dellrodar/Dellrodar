# Journal 5-1: Computer Science Trends and Artifact Update

**Emilio Crocco**  
CS-499: Computer Science Capstone  
Southern New Hampshire University  
August 1, 2026  
Revised: August 8, 2026

Two developments in computer science that stand out to me are cybersecurity in the age of artificial intelligence models and the growing use of AI in advanced weaponry. Both show how quickly AI is moving from isolated tools into systems with much broader consequences. They also reinforce something I have come to appreciate more throughout this program: software development is not only about whether an application works. Security, reliability, oversight, and the effect a system can have on people all matter just as much.

Cybersecurity is one area where that shift is already becoming obvious. Generative AI gives attackers new ways to automate parts of an attack, improve phishing and social engineering, discover vulnerabilities, and create malicious content more efficiently. NIST identifies information security as an area where generative AI can lower the barrier to offensive cyber capabilities, including vulnerability discovery, malware, phishing, and related attacks (Autio et al., 2024). The FBI has raised similar concerns, warning that criminals are using AI to make fraud and cyberattacks more convincing and easier to scale, especially through phishing and social engineering (Federal Bureau of Investigation, 2024).

At the same time, AI is not only an offensive tool. It can also help security teams detect unusual behavior, analyze threats, and respond more quickly. NIST's Cyber AI Profile treats AI-enabled cyber defense and protection against AI-enabled attacks as two major areas organizations need to prepare for (Megas et al., 2025). To me, that is what makes this trend especially important. The same technology can improve defense while also making attacks faster, cheaper, and more convincing.

AI also brings security concerns that are different from the ones developers are used to seeing in traditional applications. The OWASP Top 10 for large language model applications identifies risks such as prompt injection, sensitive information disclosure, insecure interactions with external systems, excessive permissions, and weaknesses in how models process or return information (OWASP Foundation, 2025). NIST also describes concerns involving privacy, system integration, malicious use, and exposure of sensitive information throughout the AI lifecycle (Autio et al., 2024). That changes how developers have to think about an application. An AI model cannot really be treated as a separate feature if it has access to APIs, user data, authentication systems, or other application components.

I think this will make cybersecurity an even larger part of normal software development. NIST's AI Risk Management Framework emphasizes managing risk throughout the design, development, deployment, and use of AI systems rather than waiting until something goes wrong after release (Tabassi, 2023). Practices such as least privilege, validation, controlled access, logging, testing, and defense-in-depth will still matter. The difference is that developers will need to apply them to systems that may interact with data and other services in more complex ways.

There is also a direct effect on consumers and workers. AI can help create better security tools and faster threat detection, but it can also make phishing, impersonation, and automated attacks more believable. That means security will continue to depend on both technical safeguards and user awareness. Better tools can reduce risk, but they do not remove the need for people to understand the kinds of threats they may be facing.

This trend fits closely with my career interests in software development. I expect more applications to incorporate AI models and automated decision-making, so developers will have more responsibility for making sure those systems do not expose organizational or user information. NIST specifically identifies privacy and sensitive-data exposure as risks that can occur through training data, inputs, outputs, and system interactions (Autio et al., 2024). My capstone project has reinforced the same general mindset through authentication, role-based authorization, validation, database constraints, and controlled access to application functions. Even though the project itself is not centered on AI, the security principles still carry over. As AI becomes more common in software systems, I expect secure AI integration to become an increasingly useful development skill.

The second trend is the use of AI in advanced weaponry. This is a very different use case, but it raises many of the same questions about reliability, decision-making, and responsibility. AI can support surveillance, navigation, threat identification, target recognition, and autonomous or semi-autonomous operation. What makes this trend different is the consequence of failure. In a normal application, a defect may cause inconvenience, downtime, or financial loss. In a weapons system, a software error could have a direct physical impact.

The U.S. Department of Defense addresses that concern in Directive 3000.09, which establishes policy for autonomous and semi-autonomous weapon systems and requires appropriate levels of human judgment over the use of force. The directive also emphasizes realistic testing, reliability, effectiveness, and safeguards intended to reduce the possibility of unintended engagements (U.S. Department of Defense, 2023). Those requirements make sense because these systems may have to operate in environments where information is incomplete, conditions change quickly, and the cost of a bad decision can be extremely high.

From a software engineering perspective, that creates a much higher level of responsibility. Developers working on these systems have to consider unreliable sensor data, unexpected environmental conditions, system failures, adversarial manipulation, and the consequences of incorrect automated decisions. Testing and reliability become even more important because a defect can have consequences far beyond what most developers encounter in ordinary software. The Department of Defense's requirements reinforce the need for dependable system behavior, responsible AI practices, and human oversight before these technologies are used operationally (U.S. Department of Defense, 2023).

There are also ethical and humanitarian concerns that go beyond the technical side. The International Committee of the Red Cross has argued that unpredictable autonomous weapon systems can create risks for civilians and raise legal and ethical concerns when human control over the use of force is reduced. It also identifies concerns involving escalation, accountability, and the difficulty of predicting how a weapon may behave in a particular environment (International Committee of the Red Cross, 2021). These issues make the discussion about autonomous weapons larger than just whether the technology is possible. The harder question is how much decision-making should be delegated to a machine when the consequences can involve human life.

From a citizen's perspective, AI-enabled defense systems may provide military advantages, but they also create questions about surveillance, accountability, human judgment, and the limits of automation. I think that is where this trend becomes especially relevant to computer science. Technical capability does not automatically mean a system should be given complete control over a decision.

Although I do not intend to work specifically on autonomous weapon systems, many of the underlying concerns still apply directly to software development. Reliable software depends on clear requirements, testing, secure architecture, monitoring, predictable behavior, and accountability. This trend is a strong example of why developers have to think about the consequences of automated decisions instead of looking only at whether a system performs its assigned task. It also shows why human oversight still matters in some situations, even when automation is technically possible.

At this stage of the capstone, I have made progress toward all five course outcomes. My narratives, technical documentation, and code review demonstrate outcome two through communication of technical decisions to different audiences. The architectural redesign, animal-matching algorithm, and relational database improvements demonstrate outcome three by applying design principles, algorithms, data structures, and technical trade-offs. The FastAPI backend, React frontend, PostgreSQL database, authentication controls, matching and ranking logic, pagination, database migrations, and automated testing demonstrate outcome four through the implementation of a complete computing solution.

The project also demonstrates outcome five through authentication, role-based authorization, input validation, database constraints, and controlled data access. I have continued developing outcome one by responding to instructor feedback and improving how I document my development process. In particular, the later enhancements use more focused commits and identify the files containing the improvements more clearly than my initial enhancement. All five outcomes are now represented in the project, although the final ePortfolio still needs to bring the artifacts, narratives, code review, and professional self-assessment together into one consistent presentation.

## References

Autio, C., Schwartz, R., Dunietz, J., Jain, S., Stanley, M., Tabassi, E., Hall, P., & Roberts, K. (2024). *Artificial intelligence risk management framework: Generative artificial intelligence profile (NIST AI 600-1).* National Institute of Standards and Technology.  
https://doi.org/10.6028/NIST.AI.600-1

Federal Bureau of Investigation. (2024, May 8). *FBI warns of increasing threat of cyber criminals utilizing artificial intelligence.*  
https://www.fbi.gov/contact-us/field-offices/sanfrancisco/news/fbi-warns-of-increasing-threat-of-cyber-criminals-utilizing-artificial-intelligence

International Committee of the Red Cross. (2021, May 12). *ICRC position on autonomous weapon systems.*  
https://www.icrc.org/en/document/icrc-position-autonomous-weapon-systems

Megas, K., Cuthill, B., Dotter, M., Garris, M., Khemani, I., Patrick, B., Schiro, N., Snyder, J. N., & Zarei, M. (2025). *Cybersecurity framework profile for artificial intelligence (Cyber AI Profile): NIST community profile (NIST IR 8596, initial preliminary draft).* National Institute of Standards and Technology.  
https://csrc.nist.gov/pubs/ir/8596/iprd

OWASP Foundation. (2025). *OWASP Top 10 for large language model applications.*  
https://genai.owasp.org/

Tabassi, E. (2023). *Artificial intelligence risk management framework (AI RMF 1.0) (NIST AI 100-1).* National Institute of Standards and Technology.  
https://doi.org/10.6028/NIST.AI.100-1

U.S. Department of Defense. (2023, January 25). *DoD announces update to DoD Directive 3000.09, “Autonomy in weapon systems.”*  
https://www.war.gov/News/Releases/Release/Article/3278076/dod-announces-update-to-dod-directive-300009-autonomy-in-weapon-systems/
