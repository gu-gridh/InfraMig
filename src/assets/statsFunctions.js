export const calcSNI = (workers) => {
    if (!workers || workers.length === 0) return null

    const totalWorkers = workers.length
    console.log('Total workers:', totalWorkers)
    //all workers belong to either C, F, H, N, O branches, count how many belong to each
    const branchCounts = {
        C: 0,
        F: 0,
        H: 0,
        N: 0,
        O: 0
    }

    workers.forEach(worker => {
        const branch = worker.sni_code ? worker.sni_code.charAt(0) : null
        if (branchCounts.hasOwnProperty(branch)) {
            branchCounts[branch]++
        }
    })
    //count percentage of workers in each branch
    for (const branch in branchCounts) {
        const count = branchCounts[branch]
        const percentage = ((count / totalWorkers) * 100).toFixed(2)
        branchCounts[branch] = { count, percentage }
    }
    console.log('Branch counts:', branchCounts)
    return branchCounts
}
