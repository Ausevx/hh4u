const answerText = `Hello! Welcome to **Healing Hands4U**. On behalf of **Dr. Anjali Jariwala**, I want to reassure you that acidity, gas, and bloating are very common digestive concerns, and with the right balance, your digestive system can find lasting relief.

---

### **Understanding Your Symptoms**
In holistic understanding, these digestive symptoms often point to an internal imbalance:
* **Acidity:** Indicates elevated **Pitta** (excess heat or digestive fire) in your upper digestive tract.

---

### **Dietary & Home Remedies**

To help restore balance gently and naturally:
1. **Cool Elevated Pitta (Relieve Acidity):**
   * Incorporate cooling, alkaline foods like **fresh cucumber** and **tender coconut water** into your daytime routine (ideally mid-morning).`;

function cleanText(text) {
    return text.replace(/\*\*|\*/g, '')
        .replace(/^#+\s*/gm, '')
        .replace(/^---+$/gm, '')
        .trim();
}

let parts = answerText.split(/\n\n+/);
parts = parts.map(p => cleanText(p)).filter(p => p.trim() !== '');

console.log('Total parts:', parts.length);
console.log('Part 0:', parts[0]);
console.log('Part 1:', parts[1]);
console.log('Part 2:', parts[2]);
