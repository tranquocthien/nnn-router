import { sampleParamGetBooks } from '../../data.mocks'

export default async (req, res) => {
  res.send('Get books')
}

export const middleware = async (req, res, next) => {
  req.sampleParam = sampleParamGetBooks
  next()
}
