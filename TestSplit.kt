fun main() {
    val answerText = """Hello! Welcome to **Healing Hands4U**. On behalf of **Dr. Anjali Jariwala**, I want to reassure you that acidity, gas, and bloating are very common digestive concerns, and with the right balance, your digestive system can find lasting relief.

---

### **Understanding Your Symptoms**
In holistic understanding, these digestive symptoms often point to an internal imbalance:
* **Acidity:** Indicates elevated **Pitta** (excess heat or digestive fire) in your upper digestive tract.

---

### **Dietary & Home Remedies**

To help restore balance gently and naturally:
1. **Cool Elevated Pitta (Relieve Acidity):**
   * Incorporate cooling, alkaline foods like **fresh cucumber** and **tender coconut water** into your daytime routine (ideally mid-morning)."""

    // Simulated cleanText
    fun cleanText(text: String): String {
        return text.replace(Regex("\\*\\*|\\*"), "")
            .replace(Regex("^#+\\s*", RegexOption.MULTILINE), "")
            .replace(Regex("^---+$", RegexOption.MULTILINE), "")
            .trim()
    }

    // New split logic
    val parts = answerText.split(Regex("\\n\\n+")).map { cleanText(it) }.filter { it.isNotBlank() }
    
    println("Total parts after filter: ${parts.size}")
    
    val reason = if (parts.size >= 2) parts[parts.size - 2] else parts.firstOrNull()
    val remedy = if (parts.size >= 2) parts.last() else null

    println("Reason: \$reason")
    println("Remedy: \$remedy")
}
