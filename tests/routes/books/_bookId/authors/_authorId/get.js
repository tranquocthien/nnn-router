export default async (req, res) => {
  res.send(`Get bookId ${req.params.bookId} => authorId ${req.params.authorId}`)
}
