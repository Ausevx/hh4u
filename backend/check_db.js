const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://test1magnitude_db_user:JZvOlrRvxOZ0XnBb@cluster0.iifejq3.mongodb.net/hh4u?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  const ans = await db.collection('answers').find({ answerText: { $regex: 'Cool Pitta', $options: 'i' } }).toArray();
  for (let a of ans) {
    if (a.answerText.includes('acidity')) {
      console.log('REASON: ' + a.reasonText);
      console.log('ANSWER: ' + a.answerText);
    }
  }
  mongoose.disconnect();
});
