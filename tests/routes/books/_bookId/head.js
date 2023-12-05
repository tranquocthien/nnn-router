export default async (req, res) => {
  res.send('Head bookId: ' + req.params.bookId)
}
